import { isTikTokShortLink, tiktokVideoId } from "./embed";

const TIMEOUT_MS = 10_000;
const COVER_MAX_BYTES = 2 * 1024 * 1024;

/** Follows a TikTok share link to the real video URL; other links pass through unchanged. */
export async function resolveTikTokUrl(raw: string): Promise<string> {
  const url = raw.trim();
  if (!isTikTokShortLink(url)) return url;

  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SwibbleCMS)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await response.body?.cancel().catch(() => {});

  const resolved = new URL(response.url);
  resolved.search = "";
  resolved.hash = "";
  if (!tiktokVideoId(resolved.toString())) {
    throw new Error("Der TikTok-Kurzlink führt zu keinem Video.");
  }
  return resolved.toString();
}

/** TikTok thumbnails live on signed, expiring CDN URLs — only these hosts are ever fetched. */
export function isTikTokCdnUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /(^|\.)(tiktokcdn|tiktokcdn-eu|tiktokcdn-us|tiktokv|ibyteimg|byteimg)\.com$/.test(
        url.hostname.toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}

/** Current cover of a public TikTok video via the official oEmbed endpoint. */
export async function fetchTikTokCover(
  sourceUrl: string,
): Promise<{ body: Buffer; contentType: string }> {
  if (!tiktokVideoId(sourceUrl)) throw new Error("Kein TikTok-Video.");

  const oembed = await fetch(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(sourceUrl)}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" },
  );
  if (!oembed.ok) throw new Error("TikTok liefert keine Vorschau.");
  const { thumbnail_url: thumbnailUrl } = (await oembed.json()) as {
    thumbnail_url?: string;
  };
  if (!isTikTokCdnUrl(thumbnailUrl)) throw new Error("Ungültige Vorschau-Adresse.");

  const image = await fetch(thumbnailUrl, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "error",
  });
  const contentType =
    image.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!image.ok || !/^image\/(jpeg|png|webp|avif)$/.test(contentType)) {
    throw new Error("Ungültiges Vorschaubild.");
  }
  const body = Buffer.from(await image.arrayBuffer());
  if (!body.length || body.length > COVER_MAX_BYTES) {
    throw new Error("Ungültiges Vorschaubild.");
  }
  return { body, contentType };
}
