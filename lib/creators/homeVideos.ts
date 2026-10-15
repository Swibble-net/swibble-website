import { isTrustedMediaUrl } from "@/lib/videos/appVideos";
import type { Video } from "@/lib/videos/types";
import { getAllVideos, getVideo, isPlayable } from "@/lib/videos/videos";
import { VIDEO_COVER_MAX_BYTES, VIDEO_MAX_BYTES } from "./config";

/**
 * Videos of the home page carousel for creator pages. Their storage refuses
 * browser downloads (no CORS), so the server copies the MP4 and its cover —
 * the creator page then keeps working if the home page video is removed.
 */

const TIMEOUT_MS = 45_000;

/** Home page videos that can be copied: finished MP4s on our own storage. */
export function isCopyableHomeVideo(video: Video): boolean {
  return video.source === "app" && isPlayable(video) && isTrustedMediaUrl(video.videoUrl);
}

export interface HomeVideoOption {
  id: string;
  title: string;
  accountName: string;
  coverUrl: string;
}

export async function listCopyableHomeVideos(): Promise<HomeVideoOption[]> {
  return (await getAllVideos()).filter(isCopyableHomeVideo).map((video) => ({
    id: video.id,
    title: video.title,
    accountName: video.accountName,
    coverUrl: isTrustedMediaUrl(video.coverUrl) ? video.coverUrl : "",
  }));
}

async function download(
  url: string,
  maxBytes: number,
  types: RegExp,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!types.test(contentType)) return null;
  if (Number(res.headers.get("content-length") || 0) > maxBytes) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.length <= maxBytes ? { buffer, contentType } : null;
}

export interface HomeVideoFile {
  buffer: Buffer;
  contentType: string;
  /** JPEG cover, null when the video has none */
  cover: Buffer | null;
  accountName: string;
  width: number;
  height: number;
}

/** Downloads a home page video and its cover; null when it can't be used. */
export async function fetchHomeVideo(id: string): Promise<HomeVideoFile | null> {
  const video = await getVideo(id);
  if (!video || !isCopyableHomeVideo(video)) return null;
  const file = await download(video.videoUrl, VIDEO_MAX_BYTES, /^video\/(mp4|quicktime|webm)$/);
  if (!file) return null;
  const cover = isTrustedMediaUrl(video.coverUrl)
    ? await download(video.coverUrl, VIDEO_COVER_MAX_BYTES, /^image\/jpeg$/).catch(() => null)
    : null;
  return {
    buffer: file.buffer,
    contentType: file.contentType,
    cover: cover?.buffer ?? null,
    accountName: video.accountName,
    width: video.width,
    height: video.height,
  };
}
