import crypto from "crypto";
import { slugify } from "@/lib/blog/slug";
import type { PitchDeckInput, PitchDeckPage } from "./types";

// Vercel functions accept at most 4.5 MB per request, so the PDF travels in
// chunks and every slide image has to fit into a single request.
export const UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024;
export const PAGE_IMAGE_MAX_BYTES = UPLOAD_CHUNK_BYTES;
// Cloud Storage composes at most 32 objects into one.
export const MAX_PDF_CHUNKS = 32;
export const PDF_MAX_BYTES = MAX_PDF_CHUNKS * UPLOAD_CHUNK_BYTES;
export const MAX_PAGES = 200;

const CUSTOMER_MAX_LENGTH = 80;
const TITLE_MAX_LENGTH = 120;
const SLUG_SUFFIX_LENGTH = 8;
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** "Kaisergarten Aachen" → "kaisergarten-aachen-k7m2p9qx" */
export function buildSlug(customer: string): string {
  const bytes = crypto.randomBytes(SLUG_SUFFIX_LENGTH);
  const suffix = Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
  const base = slugify(customer).slice(0, 40).replace(/-+$/, "");
  return base ? `${base}-${suffix}` : suffix;
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && /^[a-z0-9-]{8,60}$/.test(slug);
}

export function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9-]{1,64}$/.test(id);
}

/** Number of upload chunks for a PDF of the given size. */
export function pdfChunkCount(size: number): number {
  return Math.max(1, Math.ceil(size / UPLOAD_CHUNK_BYTES));
}

/** "Swibble Pitch – Kaisergarten Aachen.pdf" without characters that break headers. */
export function downloadFileName(deck: { title: string; customer: string }): string {
  const name = `${deck.title} – ${deck.customer}`
    .replace(/["\\/:*?<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${name || "Präsentation"}.pdf`;
}

/** Content-Disposition value with an ASCII fallback and the UTF-8 name. */
export function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const ascii = fileName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "-");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export type ValidationResult =
  | { ok: true; input: PitchDeckInput }
  | { ok: false; message: string };

function isPage(value: unknown): value is PitchDeckPage {
  const page = value as PitchDeckPage;
  return (
    !!page &&
    Number.isInteger(page.width) &&
    Number.isInteger(page.height) &&
    page.width > 0 &&
    page.height > 0 &&
    page.width <= 8000 &&
    page.height <= 8000
  );
}

function isSize(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

export function validateInput(body: unknown): ValidationResult {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const customer = typeof data.customer === "string" ? data.customer.trim() : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";

  if (!customer) return { ok: false, message: "Bitte gib den Kunden an." };
  if (customer.length > CUSTOMER_MAX_LENGTH) {
    return { ok: false, message: `Der Kundenname ist zu lang (max. ${CUSTOMER_MAX_LENGTH} Zeichen).` };
  }
  if (!title) return { ok: false, message: "Bitte gib einen Titel an." };
  if (title.length > TITLE_MAX_LENGTH) {
    return { ok: false, message: `Der Titel ist zu lang (max. ${TITLE_MAX_LENGTH} Zeichen).` };
  }

  const pages = Array.isArray(data.pages) ? data.pages : [];
  if (pages.length === 0 || !pages.every(isPage)) {
    return { ok: false, message: "Die Folien konnten nicht gelesen werden." };
  }
  if (pages.length > MAX_PAGES) {
    return { ok: false, message: `Maximal ${MAX_PAGES} Seiten pro Präsentation.` };
  }

  if (!isSize(data.pdfSize) || !isSize(data.originalSize)) {
    return { ok: false, message: "Ungültige Dateigröße." };
  }
  if (data.pdfSize > PDF_MAX_BYTES) {
    return {
      ok: false,
      message: `Das PDF ist zu groß (max. ${PDF_MAX_BYTES / 1024 ** 2} MB, auch nach dem Komprimieren).`,
    };
  }

  return {
    ok: true,
    input: {
      customer,
      title,
      pages: pages.map((p) => ({ width: p.width, height: p.height })),
      pdfSize: data.pdfSize,
      originalSize: data.originalSize,
      compressed: data.compressed === true,
    },
  };
}

/** Link previews (WhatsApp, Slack, …) and crawlers must not count as views. */
export function isPreviewAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|linkedin|skype|signal|headless|curl|wget/i.test(
    userAgent,
  );
}

export function isJpeg(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

export function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}
