import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { toEmbedUrl } from "./embed";
import type { Video, VideoInput } from "./types";

const COLLECTION = "videos";

interface VideoDocument {
  title: string;
  embedUrl: string;
  coverPath?: string;
  createdAt: number;
}

function toVideo(id: string, data: VideoDocument): Video {
  return {
    id,
    title: data.title ?? "",
    embedUrl: data.embedUrl ?? "",
    coverPath: data.coverPath ?? "",
    createdAt: data.createdAt ?? 0,
  };
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

export async function createVideo(input: VideoInput): Promise<Video> {
  const data: VideoDocument = {
    title: input.title?.trim() ?? "",
    embedUrl: toEmbedUrl(input.url),
    coverPath: toCoverPath(input.cover),
    createdAt: Date.now(),
  };

  const ref = await getDb().collection(COLLECTION).add(data);
  return toVideo(ref.id, data);
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

export async function deleteVideo(id: string): Promise<boolean> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
