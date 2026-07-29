import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { toEmbedUrl } from "./embed";
import type { Video, VideoInput } from "./types";

const COLLECTION = "videos";

interface VideoDocument {
  title: string;
  embedUrl: string;
  createdAt: number;
}

function toVideo(id: string, data: VideoDocument): Video {
  return {
    id,
    title: data.title ?? "",
    embedUrl: data.embedUrl ?? "",
    createdAt: data.createdAt ?? 0,
  };
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
    createdAt: Date.now(),
  };

  const ref = await getDb().collection(COLLECTION).add(data);
  return toVideo(ref.id, data);
}

export async function deleteVideo(id: string): Promise<boolean> {
  const ref = getDb().collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
