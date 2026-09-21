// Browser-only helpers for the parental consent upload. Photos straight from a
// phone camera are often 4–10 MB, more than fits through a Vercel function, so
// they are downscaled to a readable JPEG before upload.

import { CONSENT_FILE_MAX_BYTES, PHOTO_MAX_BYTES } from "./config";

// "image/*" rather than a list of types: file pickers (notably on macOS) grey
// out everything that isn't listed — WebP, AVIF, HEIC variants … Whatever the
// browser can decode is converted to JPEG before upload anyway.
export const CONSENT_FILE_ACCEPT = "image/*,application/pdf,.pdf,.heic,.heif";

export interface PreparedFile {
  /** Base64 without the data: prefix */
  data: string;
  name: string;
  size: number;
}

export class ConsentFileError extends Error {}

export const PHOTO_ACCEPT = "image/*,.heic,.heif";

const MAX_MB = (CONSENT_FILE_MAX_BYTES / (1024 * 1024)).toLocaleString("de-DE", {
  maximumFractionDigits: 1,
});

function isImage(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|heic|heif|webp|avif|gif|bmp)$/i.test(file.name)
  );
}

/** Formats the server accepts as they are (checked there by magic bytes). */
function isServerReadyImage(file: File): boolean {
  return (
    /^image\/(jpeg|png|heic|heif)$/.test(file.type) ||
    (!file.type && /\.(jpe?g|png|heic|heif)$/i.test(file.name))
  );
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

async function downscale(
  file: File,
  maxSide: number,
  quality: number,
): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    // Fails for formats the browser can't decode (HEIC outside Safari).
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // White background: transparent PNGs would otherwise turn black as JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality),
  );
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new ConsentFileError("Die Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(blob);
  });
}

/** Checks the chosen file, shrinks large photos and returns it as base64. */
export async function prepareConsentFile(file: File): Promise<PreparedFile> {
  if (!isPdf(file) && !isImage(file)) {
    throw new ConsentFileError(
      "Bitte wähle ein PDF oder ein Foto (JPG, PNG, HEIC).",
    );
  }

  let blob: Blob = file;

  // Large photos are shrunk; other image formats (WebP, AVIF, …) are always
  // converted, because the server only accepts JPEG, PNG, HEIC and PDF.
  const mustConvert = isImage(file) && !isServerReadyImage(file);
  if (isImage(file) && (mustConvert || file.size > 600 * 1024)) {
    let converted = false;
    // Two attempts: good quality first, then smaller if still too big.
    for (const [maxSide, quality] of [
      [2200, 0.82],
      [1600, 0.65],
    ]) {
      const scaled = await downscale(file, maxSide, quality);
      if (!scaled) break;
      blob = scaled;
      converted = true;
      if (blob.size <= CONSENT_FILE_MAX_BYTES) break;
    }
    if (mustConvert && !converted) {
      throw new ConsentFileError(
        "Dieses Bildformat kann dein Browser nicht verarbeiten. Tipp: Mach einen Screenshot davon und lade den hoch.",
      );
    }
  }

  if (blob.size > CONSENT_FILE_MAX_BYTES) {
    throw new ConsentFileError(
      isPdf(file)
        ? `Das PDF ist zu groß (maximal ${MAX_MB} MB). Tipp: Mach stattdessen ein Foto vom Zettel.`
        : `Das Foto ist zu groß (maximal ${MAX_MB} MB) und konnte nicht automatisch verkleinert werden. Tipp: Mach einen Screenshot vom Foto und lade den hoch.`,
    );
  }

  return { data: await toBase64(blob), name: file.name, size: blob.size };
}

/**
 * Prepares an optional applicant photo: always re-encoded as JPEG and shrunk
 * until it fits the per-photo budget. Also returns an object URL for the
 * preview (the caller revokes it).
 */
export async function preparePhoto(
  file: File,
): Promise<PreparedFile & { previewUrl: string }> {
  if (!isImage(file)) {
    throw new ConsentFileError("Bitte wähle ein Foto (JPG, PNG oder HEIC).");
  }

  let blob: Blob | null = null;
  for (const [maxSide, quality] of [
    [1400, 0.8],
    [1200, 0.7],
    [1000, 0.6],
    [800, 0.5],
  ]) {
    blob = await downscale(file, maxSide, quality);
    if (!blob) break;
    if (blob.size <= PHOTO_MAX_BYTES) break;
  }

  if (!blob) {
    throw new ConsentFileError(
      "Dieses Foto kann dein Browser nicht verarbeiten. Tipp: Mach einen Screenshot vom Foto und lade den hoch.",
    );
  }
  if (blob.size > PHOTO_MAX_BYTES) {
    throw new ConsentFileError("Das Foto ist zu groß. Bitte wähle ein anderes.");
  }

  return {
    data: await toBase64(blob),
    name: file.name,
    size: blob.size,
    previewUrl: URL.createObjectURL(blob),
  };
}
