// Browser-only: renders the online-signed parental declaration into one image
// (A4 proportions), so the admin area holds a complete signed document rather
// than a bare signature. The server additionally stores the declaration text,
// the guardian's details and the timestamp as data.

import { CONSENT_TEMPLATE_IS_DRAFT } from "./config";

export interface DeclarationDocumentInput {
  childName: string;
  birthDate: string; // TT.MM.JJJJ
  guardianName: string;
  guardianContact: string;
  guardianAddress: string;
  /** Intro + numbered clauses, separated by blank lines */
  declarationText: string;
  /** PNG data URL from the signature pad */
  signatureDataUrl: string;
  signedAt: Date;
}

const WIDTH = 1240;
const MARGIN = 90;
const INK = "#111111";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("signature image failed to load"));
    img.src = src;
  });
}

/** Returns the document as base64 JPEG (without the data: prefix). */
export async function renderDeclarationDocument(
  input: DeclarationDocumentInput,
): Promise<{ data: string; size: number }> {
  const signature = await loadImage(input.signatureDataUrl);

  // Two passes: measure the height first, then draw on a canvas of that size.
  const draw = (ctx: CanvasRenderingContext2D, paint: boolean) => {
    const maxWidth = WIDTH - 2 * MARGIN;
    let y = MARGIN;

    const paragraph = (text: string, font: string, lineHeight: number, gap = 14) => {
      ctx.font = font;
      for (const line of wrap(ctx, text, maxWidth)) {
        if (paint) ctx.fillText(line, MARGIN, y);
        y += lineHeight;
      }
      y += gap;
    };

    ctx.fillStyle = INK;
    ctx.textBaseline = "top";

    if (CONSENT_TEMPLATE_IS_DRAFT) {
      ctx.fillStyle = "#cc0000";
      paragraph("ENTWURF – NOCH NICHT RECHTLICH GEPRÜFT", "bold 22px sans-serif", 30, 20);
      ctx.fillStyle = INK;
    }

    paragraph("Einverständniserklärung der Erziehungsberechtigten", "bold 36px sans-serif", 46, 6);
    paragraph("online abgegeben über www.swibble.net/bewerben", "20px sans-serif", 28, 26);

    paragraph("1. Angaben zum Kind", "bold 24px sans-serif", 32, 6);
    paragraph(`${input.childName}, geboren am ${input.birthDate}`, "22px sans-serif", 32, 22);

    paragraph("2. Erziehungsberechtigte Person", "bold 24px sans-serif", 32, 6);
    paragraph(input.guardianName, "22px sans-serif", 32, 0);
    paragraph(input.guardianContact, "22px sans-serif", 32, 0);
    if (input.guardianAddress) paragraph(input.guardianAddress, "22px sans-serif", 32, 0);
    y += 22;

    paragraph("3. Erklärung", "bold 24px sans-serif", 32, 6);
    for (const block of input.declarationText.split(/\n\n+/)) {
      paragraph(block, "20px sans-serif", 29, 12);
    }
    y += 16;

    const signedAt = input.signedAt.toLocaleString("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    });
    paragraph(`Online unterschrieben am ${signedAt} Uhr`, "22px sans-serif", 32, 10);

    const sigWidth = 600;
    const sigHeight = Math.round((signature.height / signature.width) * sigWidth);
    if (paint) {
      ctx.drawImage(signature, MARGIN, y, sigWidth, sigHeight);
      ctx.fillRect(MARGIN, y + sigHeight, sigWidth, 2);
    }
    y += sigHeight + 10;
    paragraph(`Unterschrift: ${input.guardianName}`, "18px sans-serif", 26, 0);

    return y + MARGIN;
  };

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("canvas unavailable");
  const height = Math.max(1754, draw(probe, false));

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  draw(ctx, true);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("document could not be rendered");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("document could not be read"));
    reader.readAsDataURL(blob);
  });

  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), size: blob.size };
}
