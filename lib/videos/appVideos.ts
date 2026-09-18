import type { AppVideoCandidatePage, AppVideoJob } from "./types";

/**
 * Server-side client for the Swibble app's website video API. The shared key
 * never reaches the browser: CMS pages talk to /api/admin/app-videos instead.
 */

const TIMEOUT_MS = 25_000;

export class AppVideoError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export function isAppVideoApiConfigured(): boolean {
  return Boolean(
    process.env.SWIBBLE_APP_VIDEO_API_URL &&
      (process.env.SWIBBLE_APP_VIDEO_API_KEY ?? "").length >= 32,
  );
}

function endpoint(path: string, query?: Record<string, string>): URL {
  const base = process.env.SWIBBLE_APP_VIDEO_API_URL ?? "";
  const url = new URL(`${base.replace(/\/+$/, "")}${path}`);
  if (url.protocol !== "https:") {
    throw new AppVideoError("Die Swibble-App-Adresse muss https verwenden.", 500);
  }
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

async function call(
  path: string,
  init: { method?: "GET" | "POST"; query?: Record<string, string>; body?: unknown } = {},
): Promise<Response> {
  if (!isAppVideoApiConfigured()) {
    throw new AppVideoError("Die Verbindung zur Swibble-App ist nicht konfiguriert.", 503);
  }
  const response = await fetch(endpoint(path, init.query), {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${process.env.SWIBBLE_APP_VIDEO_API_KEY}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    throw new AppVideoError(
      payload?.error || "Die Swibble-App hat die Anfrage abgelehnt.",
      response.status === 401 ? 502 : response.status,
      payload?.code,
    );
  }
  return response;
}

export async function listAppVideos(query: {
  page?: string;
  q?: string;
}): Promise<AppVideoCandidatePage> {
  const response = await call("/candidates", {
    query: { page: query.page ?? "1", limit: "12", q: query.q ?? "" },
  });
  return (await response.json()) as AppVideoCandidatePage;
}

export async function fetchAppVideoThumbnail(
  assetId: string,
  fileId: string,
): Promise<{ body: Buffer; contentType: string }> {
  const response = await call("/thumbnail", { query: { assetId, fileId } });
  const contentType =
    response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!/^image\/(jpeg|png|webp|gif)$/.test(contentType)) {
    throw new AppVideoError("Ungültiges Vorschaubild.", 502);
  }
  return { body: Buffer.from(await response.arrayBuffer()), contentType };
}

export async function publishAppVideo(
  assetId: string,
  fileId: string,
): Promise<AppVideoJob> {
  const response = await call("/publish", {
    method: "POST",
    body: { assetId, fileId },
  });
  return (await response.json()) as AppVideoJob;
}

export async function getAppVideoJob(jobId: string): Promise<AppVideoJob> {
  const response = await call("/status", { query: { jobId } });
  return (await response.json()) as AppVideoJob;
}

export async function unpublishAppVideo(jobId: string): Promise<void> {
  await call("/unpublish", { method: "POST", body: { jobId } });
}

/** Only tokenized Firebase Storage downloads of the web copies are ever stored or rendered. */
export function isTrustedMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "firebasestorage.googleapis.com" &&
      url.pathname.includes("/o/website-videos%2F") &&
      url.searchParams.get("alt") === "media" &&
      Boolean(url.searchParams.get("token"))
    );
  } catch {
    return false;
  }
}
