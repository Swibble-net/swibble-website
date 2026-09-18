import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { toEmbedUrl } from "./embed";
import { isTrustedMediaUrl } from "./appVideos";
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
    // Never render a stored URL that is not one of our own web copies.
    videoUrl: isTrustedMediaUrl(data.videoUrl) ? data.videoUrl : "",
    coverUrl: isTrustedMediaUrl(data.coverUrl) ? data.coverUrl : "",
    width: Number(data.width) || 0,
    height: Number(data.height) || 0,
    duration: Number(data.duration) || 0,
    size: Number(data.size) || 0,
    hasAudio: data.hasAudio === true,
    appJobId: data.appJobId ?? "",
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

/** Oldest first, so the carousel keeps the order videos were added in. */
export async function getAllVideos(): Promise<Video[]> {
  if (!isFirebaseConfigured()) return [];

  const snapshot = await getDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.map((doc) =>
    toVideo(doc.id, doc.data() as VideoDocument),
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
  const data: VideoDocument = {
    title: input.title?.trim() ?? "",
    source: "embed",
    embedUrl: toEmbedUrl(input.url),
    coverPath: toCoverPath(input.cover),
    createdAt: Date.now(),
  };

  const ref = await getDb().collection(COLLECTION).add(data);
  return toVideo(ref.id, data);
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
): Promise<Video> {
  const collection = getDb().collection(COLLECTION);
  const existing = await collection
    .where("appJobId", "==", job.jobId)
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    const fields = appJobFields(job);
    await doc.ref.update(fields);
    return toVideo(doc.id, { ...(doc.data() as VideoDocument), ...fields });
  }

  const data: VideoDocument = {
    title: (title ?? job.title ?? "").trim().slice(0, 200),
    source: "app",
    appJobId: job.jobId,
    createdAt: Date.now(),
    ...appJobFields(job),
  };
  const ref = await collection.add(data);
  return toVideo(ref.id, data);
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

  const coverPath = toCoverPath(cover);
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
