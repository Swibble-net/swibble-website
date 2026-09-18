import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { tiktokVideoId, toEmbedUrl } from "./embed";
import { resolveTikTokUrl } from "./tiktok";
import { isAppVideoApiConfigured, isTrustedMediaUrl, listAppVideos } from "./appVideos";
import type {
  AppVideoJob,
  AppVideoStatus,
  Video,
  VideoInput,
  VideoSettings,
} from "./types";

const COLLECTION = "videos";
const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOCUMENT = "videos";

type VideoDocument = Partial<Omit<Video, "id">>;

export function toVideo(id: string, data: VideoDocument): Video {
  const source = data.source === "app" ? "app" : "embed";
  return {
    id,
    title: data.title ?? "",
    source,
    embedUrl: data.embedUrl ?? "",
    coverPath: data.coverPath ?? "",
    sourceUrl: data.sourceUrl ?? "",
    // Never render a stored URL that is not one of our own web copies.
    videoUrl: isTrustedMediaUrl(data.videoUrl) ? data.videoUrl : "",
    coverUrl: isTrustedMediaUrl(data.coverUrl) ? data.coverUrl : "",
    width: Number(data.width) || 0,
    height: Number(data.height) || 0,
    duration: Number(data.duration) || 0,
    size: Number(data.size) || 0,
    hasAudio: data.hasAudio === true,
    appJobId: data.appJobId ?? "",
    accountName: typeof data.accountName === "string" ? data.accountName : "",
    status: source === "app" ? (data.status ?? "processing") : "ready",
    createdAt: data.createdAt ?? 0,
  };
}

/** Visitors only ever see videos that can actually play. */
export function isPlayable(video: Video): boolean {
  return video.source === "app"
    ? video.status === "ready" && Boolean(video.videoUrl)
    : Boolean(video.embedUrl);
}

const COVER_FILE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(avif|jpe?g|png|webp)$/i;

/**
 * Keep covers on the same origin and inside the project's public directory.
 * Accepting a file name rather than a URL also prevents accidental remote loads.
 */
export function toCoverPath(value?: string): string {
  const fileName = value
    ?.trim()
    .replace(/^\/?video-covers\//, "")
    .trim();

  if (!fileName) return "";
  if (!COVER_FILE_PATTERN.test(fileName)) {
    throw new Error(
      "Cover must be an AVIF, JPG, PNG or WebP file from public/video-covers.",
    );
  }

  return `/video-covers/${fileName}`;
}

/**
 * Carousel order: videos sorted in the CMS come first (by their stored `position`);
 * videos that were never sorted, e.g. just added, follow oldest first.
 */
export function sortByPosition<T extends { position?: unknown }>(items: T[]): T[] {
  const rank = (item: T) =>
    typeof item.position === "number" ? item.position : Number.POSITIVE_INFINITY;
  // Array.prototype.sort is stable, so equal ranks keep their createdAt order.
  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra === rb ? 0 : ra < rb ? -1 : 1;
  });
}

async function getOrderedDocs() {
  const snapshot = await getDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "asc")
    .get();
  return sortByPosition(
    snapshot.docs.map((doc) => ({
      doc,
      position: (doc.data() as { position?: unknown }).position,
    })),
  ).map(({ doc }) => doc);
}

export async function getAllVideos(): Promise<Video[]> {
  if (!isFirebaseConfigured()) return [];

  return (await getOrderedDocs()).map((doc) =>
    toVideo(doc.id, doc.data() as VideoDocument),
  );
}

/**
 * Stores a new carousel order. `ids` is the wanted order; unknown ids are ignored and
 * videos missing from the list keep their relative order behind the listed ones.
 */
export async function reorderVideos(ids: string[]): Promise<Video[]> {
  const docs = await getOrderedDocs();
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const wanted = [...new Set(ids)].filter((id) => byId.has(id));
  const rest = docs.map((doc) => doc.id).filter((id) => !wanted.includes(id));
  const ordered = [...wanted, ...rest];

  const batch = getDb().batch();
  ordered.forEach((id, position) => {
    batch.update(byId.get(id)!.ref, { position });
  });
  await batch.commit();

  return ordered.map((id) =>
    toVideo(id, byId.get(id)!.data() as VideoDocument),
  );
}

export async function getPublicVideos(): Promise<Video[]> {
  return (await getAllVideos()).filter(isPlayable);
}

export async function getVideo(id: string): Promise<Video | null> {
  const snapshot = await getDb().collection(COLLECTION).doc(id).get();
  return snapshot.exists
    ? toVideo(id, snapshot.data() as VideoDocument)
    : null;
}

export async function createVideo(input: VideoInput): Promise<Video> {
  const url = await resolveTikTokUrl(input.url);
  const isTikTok = Boolean(tiktokVideoId(url));
  const data: VideoDocument = {
    title: input.title?.trim() ?? "",
    source: "embed",
    embedUrl: toEmbedUrl(url),
    coverPath: toCoverPath(input.cover),
    ...(isTikTok ? { sourceUrl: url } : {}),
    createdAt: Date.now(),
  };

  const ref = await getDb().collection(COLLECTION).add(data);
  // TikTok videos bring their own cover unless a local file was chosen.
  if (isTikTok && !data.coverPath) {
    data.coverPath = tiktokCoverPath(ref.id);
    await ref.update({ coverPath: data.coverPath });
  }
  return toVideo(ref.id, data);
}

export function tiktokCoverPath(id: string): string {
  return `/api/videos/cover/${encodeURIComponent(id)}`;
}

/** Maps the Swibble app's job state onto the fields stored with a video. */
export function appJobFields(job: AppVideoJob): VideoDocument {
  if (job.status === "ready") {
    if (!isTrustedMediaUrl(job.videoUrl) || !isTrustedMediaUrl(job.coverUrl)) {
      return { status: "failed" };
    }
    return {
      status: "ready",
      videoUrl: job.videoUrl,
      coverUrl: job.coverUrl,
      width: Number(job.width) || 0,
      height: Number(job.height) || 0,
      duration: Number(job.duration) || 0,
      size: Number(job.size) || 0,
      hasAudio: job.hasAudio === true,
    };
  }
  const status: AppVideoStatus =
    job.status === "queued" || job.status === "processing"
      ? "processing"
      : "failed";
  return { status };
}

/** One carousel entry per web copy: choosing the same video twice returns the existing entry. */
export async function createAppVideo(
  job: AppVideoJob,
  title?: string,
  accountName?: string,
): Promise<Video> {
  const customer = (accountName ?? "").trim().slice(0, 200);
  const collection = getDb().collection(COLLECTION);
  const existing = await collection
    .where("appJobId", "==", job.jobId)
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    const fields: VideoDocument = {
      ...appJobFields(job),
      ...(customer ? { accountName: customer } : {}),
    };
    await doc.ref.update(fields);
    return toVideo(doc.id, { ...(doc.data() as VideoDocument), ...fields });
  }

  const data: VideoDocument = {
    title: (title ?? job.title ?? "").trim().slice(0, 200),
    source: "app",
    appJobId: job.jobId,
    accountName: customer,
    createdAt: Date.now(),
    ...appJobFields(job),
  };
  const ref = await collection.add(data);
  return toVideo(ref.id, data);
}

const BACKFILL_PAGE_SIZE = 60;
const BACKFILL_MAX_PAGES = 20;

/**
 * App videos added before customer names were stored get theirs from the app's
 * candidate list (matched by web copy job). Runs once per video: the result is
 * stored even when no match exists, so this is a no-op on every later call.
 * Returns true when something was written.
 */
export async function backfillAccountNames(): Promise<boolean> {
  if (!isFirebaseConfigured() || !isAppVideoApiConfigured()) return false;

  const snapshot = await getDb()
    .collection(COLLECTION)
    .where("source", "==", "app")
    .get();
  const missing = snapshot.docs.filter(
    (doc) => typeof (doc.data() as VideoDocument).accountName !== "string",
  );
  if (missing.length === 0) return false;

  const namesByJob = new Map<string, string>();
  for (let page = 1; page <= BACKFILL_MAX_PAGES; page += 1) {
    const result = await listAppVideos({
      page: String(page),
      limit: String(BACKFILL_PAGE_SIZE),
    });
    for (const item of result.items) {
      if (item.website?.jobId) {
        namesByJob.set(item.website.jobId, item.accountName ?? "");
      }
    }
    if (page >= result.pages) break;
  }

  const batch = getDb().batch();
  for (const doc of missing) {
    const jobId = (doc.data() as VideoDocument).appJobId ?? "";
    batch.update(doc.ref, {
      accountName: (namesByJob.get(jobId) ?? "").trim().slice(0, 200),
    });
  }
  await batch.commit();
  return true;
}

export async function updateAppVideo(
  id: string,
  job: AppVideoJob,
): Promise<Video | null> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const fields = appJobFields(job);
  await ref.update(fields);
  return toVideo(id, { ...(existing.data() as VideoDocument), ...fields });
}

export async function updateVideoCover(
  id: string,
  cover?: string,
): Promise<Video | null> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const stored = existing.data() as VideoDocument;
  // Clearing the local cover of a TikTok video falls back to TikTok's own.
  const coverPath =
    toCoverPath(cover) || (stored.sourceUrl ? tiktokCoverPath(id) : "");
  await ref.update({ coverPath });

  return toVideo(id, {
    ...(existing.data() as VideoDocument),
    coverPath,
  });
}

/** Returns the removed video so the caller can clean up its web copy. */
export async function deleteVideo(id: string): Promise<Video | null> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  await ref.delete();
  return toVideo(id, existing.data() as VideoDocument);
}

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = { soundEnabled: true };

export async function getVideoSettings(): Promise<VideoSettings> {
  if (!isFirebaseConfigured()) return DEFAULT_VIDEO_SETTINGS;
  const snapshot = await getDb()
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOCUMENT)
    .get();
  return {
    soundEnabled:
      snapshot.data()?.soundEnabled ?? DEFAULT_VIDEO_SETTINGS.soundEnabled,
  };
}

export async function updateVideoSettings(
  settings: VideoSettings,
): Promise<VideoSettings> {
  const value = { soundEnabled: settings.soundEnabled === true };
  await getDb()
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOCUMENT)
    .set(value, { merge: true });
  return value;
}
