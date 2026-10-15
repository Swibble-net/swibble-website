// Browser-only: shrinks a video before upload — 720p (long side ≤ 1280 px)
// MP4 via the browser's own encoder (WebCodecs, through mediabunny). Where
// that isn't possible (older browsers, unsupported codecs) the original is
// used, so compression is a bonus and never a reason for a failed upload.

const MAX_SIDE = 1280;
// Keep the result only if it saves something worth the quality loss.
const MIN_SAVING = 0.1;

export interface CompressedVideo {
  blob: Blob;
  contentType: string;
  compressed: boolean;
}

export interface VideoCompression {
  result: Promise<CompressedVideo>;
  cancel: () => void;
}

/** Starts compressing `file`; the result falls back to the original file. */
export function compressVideo(
  file: File,
  contentType: string,
  onProgress: (progress: number) => void,
): VideoCompression {
  let cancel: () => void = () => {};
  let canceled = false;
  const original: CompressedVideo = { blob: file, contentType, compressed: false };

  const result = (async (): Promise<CompressedVideo> => {
    if (typeof window === "undefined" || typeof VideoEncoder === "undefined") return original;
    try {
      const {
        ALL_FORMATS,
        BlobSource,
        BufferTarget,
        Conversion,
        Input,
        Mp4OutputFormat,
        Output,
        QUALITY_MEDIUM,
      } = await import("mediabunny");

      const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
      const track = await input.getPrimaryVideoTrack();
      if (!track) return original;
      const width = track.displayWidth;
      const height = track.displayHeight;
      const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
      // Even dimensions: most H.264 encoders refuse odd sizes.
      const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

      const output = new Output({
        format: new Mp4OutputFormat({ fastStart: "in-memory" }),
        target: new BufferTarget(),
      });
      const conversion = await Conversion.init({
        input,
        output,
        video: {
          ...(scale < 1
            ? { width: even(width * scale), height: even(height * scale), fit: "contain" as const }
            : {}),
          quality: QUALITY_MEDIUM,
          // Videos have no transparency worth keeping; skips the alpha worker.
          alpha: "discard",
        },
        audio: { quality: QUALITY_MEDIUM },
      });
      // A track the browser can't re-encode would get lost: then keep the original.
      if (!conversion.isValid || conversion.discardedTracks.length > 0) return original;

      cancel = () => {
        canceled = true;
        void conversion.cancel();
      };
      if (canceled) return original;
      conversion.onProgress = (progress) => onProgress(Math.min(1, Math.max(0, progress)));
      await conversion.execute();

      const buffer = output.target.buffer;
      if (!buffer || buffer.byteLength >= file.size * (1 - MIN_SAVING)) return original;
      return {
        blob: new Blob([buffer], { type: "video/mp4" }),
        contentType: "video/mp4",
        compressed: true,
      };
    } catch {
      return original;
    }
  })();

  return { result, cancel: () => cancel() };
}
