import { CONSENT_FILE_MAX_BYTES, PHOTO_MAX_BYTES } from "./config";

export type ConsentFileType =
  | { mime: "application/pdf"; extension: "pdf" }
  | { mime: "image/jpeg"; extension: "jpg" }
  | { mime: "image/png"; extension: "png" }
  | { mime: "image/heic"; extension: "heic" };

// ISO-BMFF brands used by HEIC/HEIF photos (iPhone camera).
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
  "heif",
]);

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, i) => bytes[i] === byte);
}

/**
 * Detects the file type from its magic bytes. The file name and the
 * browser-supplied MIME type are never trusted.
 */
export function detectConsentFileType(
  bytes: Uint8Array,
): ConsentFileType | null {
  // %PDF-
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mime: "application/pdf", extension: "pdf" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", extension: "png" };
  }
  // ISO-BMFF: 4 bytes box size, "ftyp", 4 bytes major brand
  if (bytes.length >= 12) {
    const ascii = (from: number, to: number) =>
      String.fromCharCode(...bytes.slice(from, to));
    if (ascii(4, 8) === "ftyp" && HEIC_BRANDS.has(ascii(8, 12))) {
      return { mime: "image/heic", extension: "heic" };
    }
  }
  return null;
}

export type ConsentFileResult =
  | { ok: true; buffer: Buffer; type: ConsentFileType }
  | { ok: false; error: string };

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

interface ParseOptions {
  maxBytes: number;
  /** Allowed MIME types (checked against the magic bytes) */
  allowed: ReadonlyArray<ConsentFileType["mime"]>;
  missingMessage: string;
  typeMessage: string;
}

function parseUpload(base64: unknown, options: ParseOptions): ConsentFileResult {
  const { maxBytes } = options;
  if (typeof base64 !== "string" || base64.length === 0) {
    return { ok: false, error: options.missingMessage };
  }

  // Reject oversized payloads before allocating a buffer for them.
  if (base64.length > Math.ceil(maxBytes / 3) * 4 + 4) {
    return { ok: false, error: tooLargeMessage(maxBytes) };
  }
  if (!BASE64_PATTERN.test(base64)) {
    return { ok: false, error: "Die Datei konnte nicht gelesen werden." };
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    return { ok: false, error: "Die Datei ist leer." };
  }
  if (buffer.length > maxBytes) {
    return { ok: false, error: tooLargeMessage(maxBytes) };
  }

  const type = detectConsentFileType(buffer);
  if (!type || !options.allowed.includes(type.mime)) {
    return { ok: false, error: options.typeMessage };
  }

  return { ok: true, buffer, type };
}

/** Decodes and checks an uploaded consent file (base64 payload). */
export function parseConsentFile(
  base64: unknown,
  maxBytes: number = CONSENT_FILE_MAX_BYTES,
): ConsentFileResult {
  return parseUpload(base64, {
    maxBytes,
    allowed: ["application/pdf", "image/jpeg", "image/png", "image/heic"],
    missingMessage: "Bitte lade die Einverständniserklärung hoch.",
    typeMessage: "Bitte lade ein PDF oder ein Foto (JPG, PNG, HEIC) hoch.",
  });
}

/**
 * Decodes and checks an optional applicant photo. JPEG/PNG only: the browser
 * converts every photo to JPEG, and these are the formats the admin area can
 * display.
 */
export function parsePhoto(
  base64: unknown,
  maxBytes: number = PHOTO_MAX_BYTES,
): ConsentFileResult {
  return parseUpload(base64, {
    maxBytes,
    allowed: ["image/jpeg", "image/png"],
    missingMessage: "Das Foto konnte nicht gelesen werden.",
    typeMessage: "Bitte lade Fotos als JPG oder PNG hoch.",
  });
}

function tooLargeMessage(maxBytes: number): string {
  const mb = (maxBytes / (1024 * 1024)).toLocaleString("de-DE", {
    maximumFractionDigits: 1,
  });
  return `Die Datei ist zu groß (maximal ${mb} MB).`;
}
