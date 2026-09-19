// Browser-only helpers for the parental consent upload. Photos straight from a
// phone camera are often 4–10 MB, more than fits through a Vercel function, so
// they are downscaled to a readable JPEG before upload.

import { CONSENT_FILE_MAX_BYTES } from "./config";

export const CONSENT_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.heic,.heif,application/pdf,image/jpeg,image/png,image/heic,image/heif";

export interface PreparedFile {
  /** Base64 without the data: prefix */
  data: string;
  name: string;
  size: number;
}

export class ConsentFileError extends Error {}

const MAX_MB = (CONSENT_FILE_MAX_BYTES / (1024 * 1024)).toLocaleString("de-DE");

function isImage(file: File): boolean {
  return (
    file.type.startsWith("image/") || /\.(jpe?g|png|heic|heif)$/i.test(file.name)
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

  if (isImage(file) && file.size > 1024 * 1024) {
    // Two attempts: good quality first, then smaller if still too big.
    for (const [maxSide, quality] of [
      [2200, 0.82],
      [1600, 0.65],
    ]) {
      const scaled = await downscale(file, maxSide, quality);
      if (!scaled) break;
      blob = scaled;
      if (blob.size <= CONSENT_FILE_MAX_BYTES) break;
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
