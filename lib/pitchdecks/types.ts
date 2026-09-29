/** Pixel size of one pre-rendered slide image. */
export interface PitchDeckPage {
  width: number;
  height: number;
}

export type PitchDeckStatus = "uploading" | "ready";

export interface PitchDeck {
  id: string;
  /** Public, unguessable path segment: /pitch/<slug> */
  slug: string;
  customer: string;
  title: string;
  status: PitchDeckStatus;
  /** Storage folder holding the slide images and the PDF */
  folder: string;
  pages: PitchDeckPage[];
  /** Size of the stored (possibly compressed) PDF */
  pdfSize: number;
  /** Size of the PDF as it was uploaded by the admin */
  originalSize: number;
  compressed: boolean;
  /** Customer page views, admin visits and link previews excluded */
  views: number;
  lastViewedAt: number;
  createdAt: number;
  updatedAt: number;
}

/** What the admin sends before uploading the files. */
export interface PitchDeckInput {
  customer: string;
  title: string;
  pages: PitchDeckPage[];
  pdfSize: number;
  originalSize: number;
  compressed: boolean;
}
