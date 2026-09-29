// Browser-only: turns the chosen PDF into slide images for the customer page
// and, if that saves space, a compressed PDF built from the same images.
// Runs in the admin's browser because Vercel functions can neither receive
// large files nor run Ghostscript.

import { PDF_MAX_BYTES } from "./config";
import type { PitchDeckPage } from "./types";

// Long side of a slide image: sharp on a 2x display at ~1000 px CSS width.
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.8;
// Keep the original unless the rebuilt PDF is clearly smaller.
const MIN_SAVING = 0.1;
// pdf.js reads the file in slices of this size (only the parts a page needs).
const READ_CHUNK_BYTES = 2 * 1024 * 1024;
// Parallel pdf.js workers for rendering.
const MAX_LANES = 4;
// Browsers can't address ArrayBuffers much beyond this reliably.
const SOURCE_MAX_BYTES = 2 * 1024 ** 3;

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

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfDocument = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

/** One pdf.js worker with its own copy of the document. */
interface Lane {
  doc: PdfDocument;
  close: () => Promise<void>;
}

async function openLane(pdfjs: PdfJs, file: File): Promise<Lane> {
  const port = new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), {
    type: "module",
  });
  // The bundled typings derive `port` from its `null` default; a Worker is what it takes.
  const worker = new pdfjs.PDFWorker({ port: port as never });

  // pdf.js asks for byte ranges and gets them straight from the file on disk,
  // so a 500 MB export is never read into memory as a whole (or copied).
  const transport = new pdfjs.PDFDataRangeTransport(file.size, null);
  transport.requestDataRange = (begin: number, end: number) => {
    file
      .slice(begin, end)
      .arrayBuffer()
      .then((buffer) => transport.onDataRange(begin, new Uint8Array(buffer)))
      .catch(() => transport.abort());
  };

  const close = async () => {
    worker.destroy();
    port.terminate();
  };

  try {
    const doc = await pdfjs.getDocument({
      range: transport,
      length: file.size,
      rangeChunkSize: READ_CHUNK_BYTES,
      disableAutoFetch: true,
      disableStream: true,
      worker,
    }).promise;
    return {
      doc,
      close: async () => {
        await doc.destroy().catch(() => undefined);
        await close();
      },
    };
  } catch (error) {
    await close();
    const name = (error as { name?: string })?.name;
    throw new PdfProcessingError(
      name === "PasswordException"
        ? "Das PDF ist passwortgeschützt. Bitte exportiere es ohne Passwort."
        : "Das PDF konnte nicht gelesen werden.",
    );
  }
}

async function renderPage(doc: PdfDocument, n: number): Promise<RenderedPage> {
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

  const rendered = {
    image,
    size: { width: canvas.width, height: canvas.height },
    points: { width: base.width, height: base.height },
    links,
  };
  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();
  return rendered;
}

async function renderPages(file: File, onProgress: ProgressCallback): Promise<RenderedPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const lanes = [await openLane(pdfjs, file)];

  try {
    const total = lanes[0].doc.numPages;
    // Decoding large slide images is CPU-bound: several workers, each with
    // its own copy of the document, share the pages.
    const cores = navigator.hardwareConcurrency || 2;
    const laneCount = Math.min(MAX_LANES, Math.max(1, cores - 1), Math.ceil(total / 4));
    while (lanes.length < laneCount) lanes.push(await openLane(pdfjs, file));

    const pages: RenderedPage[] = new Array(total);
    let next = 1;
    let done = 0;
    onProgress(0, total);
    await Promise.all(
      lanes.map(async ({ doc }) => {
        while (next <= total) {
          const n = next++;
          pages[n - 1] = await renderPage(doc, n);
          onProgress(++done, total);
        }
      }),
    );
    return pages;
  } finally {
    await Promise.all(lanes.map((lane) => lane.close()));
  }
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
 * why it is only used when it saves at least 10 % — or when the original is
 * too large to store at all.
 */
export async function processPdf(
  file: File,
  options: { compress: boolean; title: string; onProgress: ProgressCallback },
): Promise<ProcessedDeck> {
  const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  // The PDF spec allows a few junk bytes before the header.
  if (!new TextDecoder("latin1").decode(header).includes("%PDF-")) {
    throw new PdfProcessingError("Bitte wähle eine PDF-Datei.");
  }
  const mustCompress = file.size > PDF_MAX_BYTES;
  if (mustCompress && file.size > SOURCE_MAX_BYTES) {
    throw new PdfProcessingError(
      `Das PDF ist zu groß (max. ${SOURCE_MAX_BYTES / 1024 ** 3} GB). Bitte exportiere es mit kleineren Bildern.`,
    );
  }

  const pages = await renderPages(file, options.onProgress);
  const slides = pages.map(({ image, size }) => ({ image, size }));

  if (options.compress || mustCompress) {
    const rebuilt = await buildImagePdf(pages, options.title);
    if (mustCompress || rebuilt.size <= file.size * (1 - MIN_SAVING)) {
      return { slides, pdf: rebuilt, originalSize: file.size, compressed: true };
    }
  }
  // The File itself is uploaded in slices; it is never held in memory.
  const original = file.type === "application/pdf" ? file : new Blob([file], { type: "application/pdf" });
  return { slides, pdf: original, originalSize: file.size, compressed: false };
}
