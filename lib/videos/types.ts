export interface Video {
  /** Firestore document id */
  id: string;
  /** Optional caption shown under the video */
  title: string;
  /** Ready-to-embed iframe src (normalized on save) */
  embedUrl: string;
  /** Optional project-local image in public/video-covers */
  coverPath: string;
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
