// Browser-only helpers of the creator editor (/admin/creator/<id>): photos are
// resized to a large version and a thumbnail; videos go up in 4 MB pieces
// with a cover frame taken from the video itself.

import { downscale, toBase64 } from "@/lib/applications/clientFile";
import {
  PHOTO_LARGE_MAX_BYTES,
  PHOTO_LARGE_MAX_SIDE,
  PHOTO_THUMB_MAX_BYTES,
  PHOTO_THUMB_MAX_SIDE,
  VIDEO_MAX_BYTES,
} from "./config";
import type { CreatorProfile } from "./types";

export class MediaError extends Error {
  constructor(message: string, readonly unauthorized = false) {
    super(message);
  }
}

async function request(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new MediaError("Keine Verbindung zum Server. Bitte versuch es noch einmal.");
  }
  if (res.status === 401) throw new MediaError("Sitzung abgelaufen.", true);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new MediaError(typeof data.message === "string" ? data.message : "Das hat nicht geklappt.");
  }
  return data;
}

async function shrink(file: File, maxSide: number, maxBytes: number): Promise<Blob> {
  for (const [side, quality] of [
    [maxSide, 0.82],
    [maxSide, 0.7],
    [Math.round(maxSide * 0.8), 0.65],
  ] as const) {
    const blob = await downscale(file, side, quality);
    if (!blob) throw new MediaError(`${file.name}: Dieses Bildformat kann dein Browser nicht lesen.`);
    if (blob.size <= maxBytes) return blob;
  }
  throw new MediaError(`${file.name}: Das Foto ist zu groß.`);
}

/** Resizes one photo and adds it to the creator page. */
export async function uploadCreatorPhoto(creatorId: string, file: File): Promise<CreatorProfile> {
  const [large, thumb] = await Promise.all([
    shrink(file, PHOTO_LARGE_MAX_SIDE, PHOTO_LARGE_MAX_BYTES),
    shrink(file, PHOTO_THUMB_MAX_SIDE, PHOTO_THUMB_MAX_BYTES),
  ]);
  const data = await request(`/api/admin/creators/${encodeURIComponent(creatorId)}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "photo", large: await toBase64(large), thumb: await toBase64(thumb) }),
  });
  return data.creator as CreatorProfile;
}

const VIDEO_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

function videoType(file: File): string {
  if (["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) return file.type;
  return VIDEO_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

/** Size and a cover frame (JPEG) of a local video file. */
async function inspectVideo(file: File): Promise<{ width: number; height: number; cover: Blob | null }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("unreadable"));
    });
    // A frame a little into the video is more telling than a black first one.
    const target = Math.min(1, (video.duration || 0) * 0.1);
    if (target > 0) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = target;
      });
    }
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const cover = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return { width: video.videoWidth, height: video.videoHeight, cover };
  } catch {
    // The browser can't decode it (e.g. HEVC in some browsers): upload without cover.
    return { width: 0, height: 0, cover: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function put(url: string, body: Blob) {
  const init = { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body };
  // One retry: a single flaky request shouldn't cost the whole upload.
  try {
    await request(url, init);
  } catch (error) {
    if (error instanceof MediaError && error.unauthorized) throw error;
    await request(url, init);
  }
}

/** Uploads a video file in pieces and puts it on the creator page. */
export async function uploadCreatorVideo(
  creatorId: string,
  file: File,
  title: string,
  onProgress: (sent: number, total: number) => void,
): Promise<CreatorProfile> {
  const contentType = videoType(file);
  if (!contentType) throw new MediaError("Bitte ein MP4-, MOV- oder WebM-Video wählen.");
  if (file.size > VIDEO_MAX_BYTES) {
    throw new MediaError(
      `Das Video ist größer als ${VIDEO_MAX_BYTES / 1024 ** 2} MB. Bitte kürzer exportieren oder über die Swibble-App hinzufügen.`,
    );
  }

  const meta = await inspectVideo(file);
  const base = `/api/admin/creators/${encodeURIComponent(creatorId)}`;
  const started = await request(`${base}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "upload",
      size: file.size,
      contentType,
      title,
      width: meta.width,
      height: meta.height,
    }),
  });
  const videoId = String((started.video as { id: string }).id);
  const chunkBytes = Number(started.chunkBytes);
  const uploadUrl = (query: string) => `${base}/upload?video=${encodeURIComponent(videoId)}&${query}`;

  try {
    const indexes = Array.from({ length: Math.max(1, Math.ceil(file.size / chunkBytes)) }, (_, i) => i);
    let sent = 0;
    onProgress(0, file.size);
    let next = 0;
    const worker = async () => {
      while (next < indexes.length) {
        const index = indexes[next++];
        const piece = file.slice(index * chunkBytes, (index + 1) * chunkBytes);
        await put(uploadUrl(`index=${index}`), piece);
        sent += piece.size;
        onProgress(sent, file.size);
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    if (meta.cover) await put(uploadUrl("cover=1"), meta.cover);
    const done = await request(uploadUrl("complete=1"), { method: "POST" });
    return done.creator as CreatorProfile;
  } catch (error) {
    await fetch(uploadUrl("abort=1"), { method: "POST" }).catch(() => undefined);
    throw error;
  }
}
