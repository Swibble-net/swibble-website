// Browser-only: renders the online-signed parental declaration into one image
// (A4 proportions), so the admin area holds a complete signed document rather
// than a bare signature. The server additionally stores the declaration text,
// the guardian's details and the timestamp as data.

import Wordmark from "@/public/logo/SwibbleWordmark.svg";
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
  /** CSS font-family of the page (Poppins), so the document matches the site */
  fontFamily?: string;
}

const WIDTH = 1240;
const MARGIN = 90;
const INK = "#000D36";
const MUTED = "#556987";
const PURPLE = "#B718EC";
const TINT = "#F9EAFF";

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
  const logo = await loadImage(Wordmark.src).catch(() => null);

  const family = input.fontFamily || "sans-serif";
  // Make sure the weights used below are available to the canvas.
  await Promise.all(
    ["400", "700"].map((weight) =>
      document.fonts.load(`${weight} 20px ${family}`).catch(() => undefined),
    ),
  );
  const font = (size: number, bold = false) =>
    `${bold ? "700" : "400"} ${size}px ${family}`;

  // Two passes: measure the height first, then draw on a canvas of that size.
  const draw = (ctx: CanvasRenderingContext2D, paint: boolean) => {
    const maxWidth = WIDTH - 2 * MARGIN;
    let y = MARGIN;

    const paragraph = (text: string, fontSpec: string, lineHeight: number, gap = 14) => {
      ctx.font = fontSpec;
      for (const line of wrap(ctx, text, maxWidth)) {
        if (paint) ctx.fillText(line, MARGIN, y);
        y += lineHeight;
      }
      y += gap;
    };

    ctx.textBaseline = "top";

    const heading = (text: string) => {
      ctx.fillStyle = PURPLE;
      paragraph(text.toUpperCase(), font(19, true), 28, 6);
      ctx.fillStyle = INK;
    };

    // Brand header: wordmark, tag, purple rule
    if (logo) {
      const logoHeight = 44;
      const logoWidth = Math.round((logo.width / logo.height) * logoHeight);
      if (paint) ctx.drawImage(logo, MARGIN, y, logoWidth, logoHeight);
    }
    ctx.font = font(17);
    const tag = "Bewerbung · Einverständnis der Eltern";
    const tagWidth = ctx.measureText(tag).width + 36;
    if (paint) {
      ctx.fillStyle = TINT;
      // roundRect is missing in older Safari versions — fall back to a plain box.
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(WIDTH - MARGIN - tagWidth, y + 4, tagWidth, 36, 18);
        ctx.fill();
      } else {
        ctx.fillRect(WIDTH - MARGIN - tagWidth, y + 4, tagWidth, 36);
      }
      ctx.fillStyle = PURPLE;
      ctx.fillText(tag, WIDTH - MARGIN - tagWidth + 18, y + 13);
    }
    y += 62;
    if (paint) {
      ctx.fillStyle = PURPLE;
      ctx.fillRect(MARGIN, y, maxWidth, 3);
    }
    y += 36;

    if (CONSENT_TEMPLATE_IS_DRAFT) {
      ctx.fillStyle = "#cc0000";
      paragraph("ENTWURF – NOCH NICHT RECHTLICH GEPRÜFT", font(22, true), 30, 20);
    }

    ctx.fillStyle = INK;
    paragraph("Einverständniserklärung der Erziehungsberechtigten", font(36, true), 48, 6);
    ctx.fillStyle = MUTED;
    paragraph("online abgegeben über www.swibble.net/bewerben", font(20), 28, 28);
    ctx.fillStyle = INK;

    heading("1. Angaben zum Kind");
    paragraph(`${input.childName}, geboren am ${input.birthDate}`, font(22), 32, 22);

    heading("2. Erziehungsberechtigte Person");
    paragraph(input.guardianName, font(22), 32, 0);
    paragraph(input.guardianContact, font(22), 32, 0);
    if (input.guardianAddress) paragraph(input.guardianAddress, font(22), 32, 0);
    y += 22;

    heading("3. Erklärung");
    for (const block of input.declarationText.split(/\n\n+/)) {
      paragraph(block, font(19), 29, 12);
    }
    y += 16;

    const signedAt = input.signedAt.toLocaleString("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    });
    paragraph(`Online unterschrieben am ${signedAt} Uhr`, font(22, true), 32, 10);

    const sigWidth = 600;
    const sigHeight = Math.round((signature.height / signature.width) * sigWidth);
    if (paint) {
      ctx.drawImage(signature, MARGIN, y, sigWidth, sigHeight);
      ctx.fillStyle = INK;
      ctx.fillRect(MARGIN, y + sigHeight, sigWidth, 2);
    }
    y += sigHeight + 10;
    ctx.fillStyle = MUTED;
    paragraph(`Unterschrift: ${input.guardianName}`, font(18), 26, 30);

    // Footer
    if (paint) {
      ctx.fillStyle = "#F0E4F5";
      ctx.fillRect(MARGIN, y, maxWidth, 2);
    }
    y += 16;
    ctx.fillStyle = "#8a7791";
    paragraph(
      "Swibble UG (haftungsbeschränkt) · Königstraße 30 · 52064 Aachen · info@swibble.net · www.swibble.net",
      font(16),
      24,
      0,
    );

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
