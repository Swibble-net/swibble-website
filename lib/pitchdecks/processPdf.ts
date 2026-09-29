// Browser-only: turns the chosen PDF into slide images for the customer page
// and, if that saves space, a compressed PDF built from the same images.
// Runs in the admin's browser because Vercel functions can neither receive
// large files nor run Ghostscript.

import type { PitchDeckPage } from "./types";

// Long side of a slide image: sharp on a 2x display at ~1000 px CSS width.
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.8;
// Keep the original unless the rebuilt PDF is clearly smaller.
const MIN_SAVING = 0.1;

export interface ProcessedSlide {
  image: Blob;
  size: PitchDeckPage;
}

export interface ProcessedDeck {
  slides: ProcessedSlide[];
  pdf: Blob;
  originalSize: number;
  compressed: boolean;
}

export type ProgressCallback = (done: number, total: number) => void;

interface LinkArea {
  /** [x1, y1, x2, y2] in PDF points, origin bottom left */
  rect: [number, number, number, number];
  url: string;
}

interface RenderedPage extends ProcessedSlide {
  /** Page size in PDF points (rotation applied) */
  points: { width: number; height: number };
  links: LinkArea[];
}

export class PdfProcessingError extends Error {}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PdfProcessingError("Folie konnte nicht umgewandelt werden."))),
      "image/jpeg",
      quality,
    ),
  );
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
  }
  return pdfjs;
}

async function renderPages(data: Uint8Array, onProgress: ProgressCallback): Promise<RenderedPage[]> {
  const pdfjs = await loadPdfJs();

  let doc;
  try {
    // pdf.js takes ownership of the buffer it gets; hand it a copy.
    doc = await pdfjs.getDocument({ data: data.slice() }).promise;
  } catch (error) {
    const name = (error as { name?: string })?.name;
    throw new PdfProcessingError(
      name === "PasswordException"
        ? "Das PDF ist passwortgeschützt. Bitte exportiere es ohne Passwort."
        : "Das PDF konnte nicht gelesen werden.",
    );
  }

  const pages: RenderedPage[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      onProgress(n - 1, doc.numPages);
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(MAX_SIDE / Math.max(base.width, base.height), 6);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new PdfProcessingError("Dein Browser kann das PDF nicht zeichnen.");
      // White background: transparent areas would otherwise turn black as JPEG.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      let image = await canvasToJpeg(canvas, JPEG_QUALITY);
      // Extremely detailed slides: one image has to fit into one request.
      if (image.size > 3.5 * 1024 * 1024) image = await canvasToJpeg(canvas, 0.6);

      // External links stay clickable in the compressed PDF.
      const links: LinkArea[] = [];
      for (const annotation of await page.getAnnotations()) {
        if (annotation.subtype !== "Link" || typeof annotation.url !== "string") continue;
        const [x1, y1, x2, y2] = base.convertToViewportRectangle(annotation.rect);
        links.push({
          rect: [
            Math.min(x1, x2),
            base.height - Math.max(y1, y2),
            Math.max(x1, x2),
            base.height - Math.min(y1, y2),
          ],
          url: annotation.url,
        });
      }

      pages.push({
        image,
        size: { width: canvas.width, height: canvas.height },
        points: { width: base.width, height: base.height },
        links,
      });
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  onProgress(pages.length, pages.length);
  return pages;
}

async function buildImagePdf(pages: RenderedPage[], title: string): Promise<Blob> {
  const { PDFDocument, PDFString } = await import("pdf-lib");
  const out = await PDFDocument.create();
  out.setTitle(title);
  out.setProducer("Swibble");
  out.setCreator("Swibble");

  for (const rendered of pages) {
    const image = await out.embedJpg(await rendered.image.arrayBuffer());
    const { width, height } = rendered.points;
    const page = out.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });

    for (const link of rendered.links) {
      const annotation = out.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: link.rect,
        Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of(link.url) },
      });
      page.node.addAnnot(out.context.register(annotation));
    }
  }

  const bytes = await out.save({ useObjectStreams: true });
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/**
 * Renders every page to a JPEG and, with compress on, rebuilds the PDF from
 * those images. Text in the compressed PDF is no longer selectable, which is
 * why it is only used when it saves at least 10 %.
 */
export async function processPdf(
  file: File,
  options: { compress: boolean; title: string; onProgress: ProgressCallback },
): Promise<ProcessedDeck> {
  const data = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder("latin1").decode(data.subarray(0, 5)) !== "%PDF-") {
    throw new PdfProcessingError("Bitte wähle eine PDF-Datei.");
  }

  const pages = await renderPages(data, options.onProgress);
  const slides = pages.map(({ image, size }) => ({ image, size }));
  const original = new Blob([data], { type: "application/pdf" });

  if (options.compress) {
    const rebuilt = await buildImagePdf(pages, options.title);
    if (rebuilt.size <= original.size * (1 - MIN_SAVING)) {
      return { slides, pdf: rebuilt, originalSize: original.size, compressed: true };
    }
  }
  return { slides, pdf: original, originalSize: original.size, compressed: false };
}
