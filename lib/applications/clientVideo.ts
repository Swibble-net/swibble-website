// Browser-only: format and a cover frame of a local video file (used by the
// creator application and the creator editor in the CMS).

const VIDEO_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

/** MIME type of a video the server accepts, "" for anything else. */
export function videoType(file: File): string {
  if (["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) return file.type;
  return VIDEO_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

/** Size and a cover frame (JPEG) of a local video file. */
export async function inspectVideo(
  file: File,
): Promise<{ width: number; height: number; cover: Blob | null }> {
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
      // Some browsers never fire loadeddata for formats they can't play.
      window.setTimeout(() => reject(new Error("timeout")), 8000);
    });
    // A frame a little into the video is more telling than a black first one.
    const target = Math.min(1, (video.duration || 0) * 0.1);
    if (target > 0) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = target;
        window.setTimeout(resolve, 3000);
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
    // The browser can't decode it (e.g. HEVC in some browsers): no cover.
    return { width: 0, height: 0, cover: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}
