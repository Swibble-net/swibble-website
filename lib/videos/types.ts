export type VideoSource = "embed" | "app";
export type AppVideoStatus = "processing" | "ready" | "failed";

export interface Video {
  /** Firestore document id */
  id: string;
  /** Optional caption shown under the video */
  title: string;
  /** "embed" = YouTube/Vimeo iframe, "app" = compressed MP4 from the Swibble app */
  source: VideoSource;
  /** Ready-to-embed iframe src (normalized on save); empty for app videos */
  embedUrl: string;
  /** Project-local image in public/video-covers, or the cover route for TikTok videos */
  coverPath: string;
  /** Original link of a TikTok video (needed to refresh its cover) */
  sourceUrl: string;
  /** Self-hosted 720p MP4 (app videos only) */
  videoUrl: string;
  /** Poster shown until the MP4 has loaded (app videos only) */
  coverUrl: string;
  width: number;
  height: number;
  /** Seconds */
  duration: number;
  /** Bytes of the compressed MP4 */
  size: number;
  hasAudio: boolean;
  /** Job id of the web copy in the Swibble app */
  appJobId: string;
  /** Customer the video was produced for; shown as the caption. Prefilled from the Swibble app, editable in the CMS. */
  accountName: string;
  status: AppVideoStatus;
  createdAt: number;
}

/** Payload accepted by the CMS when adding a video */
export interface VideoInput {
  title?: string;
  /** Any YouTube/Vimeo/embed link; will be normalized to an embed URL */
  url: string;
  /** File name of an image stored in public/video-covers */
  cover?: string;
}

export interface VideoSettings {
  /** Visitors may switch on sound for self-hosted videos (one at a time). */
  soundEnabled: boolean;
}

/** A finished video offered by the Swibble app */
export interface AppVideoCandidate {
  assetId: string;
  fileId: string;
  title: string;
  name: string;
  accountName: string;
  status: string;
  size: number | null;
  duration: number | null;
  modifiedAt: string | null;
  website: { status: string; jobId?: string } | null;
}

export interface AppVideoCandidatePage {
  items: AppVideoCandidate[];
  page: number;
  pages: number;
  total: number;
}

/** Status of a web copy as reported by the Swibble app */
export interface AppVideoJob {
  jobId: string;
  status: "queued" | "processing" | "ready" | "failed" | "unavailable";
  title?: string;
  failureCode?: string;
  videoUrl?: string;
  coverUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  hasAudio?: boolean;
}
