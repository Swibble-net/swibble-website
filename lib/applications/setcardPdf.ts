// Browser-only: shrinks a setcard / portfolio PDF that doesn't fit into the
// application request by rebuilding it from page images (pdf.js renders,
// pdf-lib assembles) — the same approach as the pitch decks, sized for a few
// pages instead of a whole deck.

import { ConsentFileError } from "./clientFile";

/** More pages than this are a portfolio, not a setcard — ask for a link instead. */
export const SETCARD_MAX_PAGES = 10;
// Larger files are not read into memory at all.
const SOURCE_MAX_BYTES = 150 * 1024 * 1024;

// Long side in px and JPEG quality, tried in this order until the PDF fits.
const ATTEMPTS: Array<[number, number]> = [
  [1600, 0.75],
  [1300, 0.65],
  [1000, 0.55],
  [800, 0.45],
];

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfDocument = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new ConsentFileError("Das PDF konnte nicht verkleinert werden.")),
      "image/jpeg",
      quality,
    ),
  );
}

async function renderPages(
  doc: PdfDocument,
  maxSide: number,
  quality: number,
): Promise<Array<{ image: Blob; width: number; height: number }>> {
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(maxSide / Math.max(base.width, base.height), 4);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ConsentFileError("Das PDF konnte nicht verkleinert werden.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    pages.push({
      image: await canvasToJpeg(canvas, quality),
      // Page size in PDF points, so the rebuilt PDF prints at the same size.
      width: base.width,
      height: base.height,
    });
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
  }
  return pages;
}

async function buildPdf(
  pages: Array<{ image: Blob; width: number; height: number }>,
): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  out.setProducer("Swibble");
  out.setCreator("Swibble");
  for (const { image, width, height } of pages) {
    const embedded = await out.embedJpg(await image.arrayBuffer());
    out.addPage([width, height]).drawImage(embedded, { x: 0, y: 0, width, height });
  }
  const bytes = await out.save({ useObjectStreams: true });
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/**
 * Returns a PDF of at most `maxBytes`, rebuilt from page images with
 * decreasing quality. Throws a ConsentFileError with a user-facing message
 * when that isn't possible.
 */
export async function shrinkPdf(file: File, maxBytes: number): Promise<Blob> {
  if (file.size > SOURCE_MAX_BYTES) {
    throw new ConsentFileError(
      "Das PDF ist zu groß. Füge stattdessen einfach den Link zu deiner Setcard oder deinem Portfolio ein.",
    );
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const port = new Worker(
    new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" },
  );
  // The bundled typings derive `port` from its `null` default; a Worker is what it takes.
  const worker = new pdfjs.PDFWorker({ port: port as never });

  let doc: PdfDocument | null = null;
  try {
    try {
      doc = await pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        worker,
      }).promise;
    } catch (error) {
      throw new ConsentFileError(
        (error as { name?: string })?.name === "PasswordException"
          ? "Das PDF ist passwortgeschützt. Bitte speichere es ohne Passwort."
          : "Das PDF konnte nicht gelesen werden.",
      );
    }

    if (doc.numPages > SETCARD_MAX_PAGES) {
      throw new ConsentFileError(
        `Das PDF hat mehr als ${SETCARD_MAX_PAGES} Seiten. Lade nur deine Setcard hoch oder füge den Link zu deinem Portfolio ein.`,
      );
    }

    for (const [maxSide, quality] of ATTEMPTS) {
      const pdf = await buildPdf(await renderPages(doc, maxSide, quality));
      if (pdf.size <= maxBytes) return pdf;
    }
    throw new ConsentFileError(
      "Das PDF lässt sich nicht klein genug machen. Füge stattdessen den Link zu deiner Setcard oder deinem Portfolio ein.",
    );
  } finally {
    await doc?.destroy().catch(() => undefined);
    worker.destroy();
    port.terminate();
  }
}
