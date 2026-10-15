// Browser-only: renders a declaration signed online — the parental consent
// (/bewerben) or the creator release (/bewerben/creator) — into one image
// (A4 proportions), so the admin area holds a complete signed document rather
// than a bare signature. The server additionally stores the declaration text,
// the personal details and the timestamp as data.

import Wordmark from "@/public/logo/SwibbleWordmark.svg";
import { CONSENT_TEMPLATE_IS_DRAFT } from "./config";

/** Generic signed document: header, detail sections, declaration, signature. */
export interface SignedDocumentInput {
  /** Small pill in the header, e.g. "Bewerbung · Einverständnis der Eltern" */
  tag: string;
  title: string;
  /** Line under the title, e.g. "online abgegeben über www.swibble.net/bewerben" */
  source: string;
  /** Numbered detail blocks before the declaration */
  sections: Array<{ heading: string; lines: string[] }>;
  declarationHeading: string;
  /** Intro + numbered clauses, separated by blank lines */
  declarationText: string;
  /** Optional line below the declaration, e.g. the ticked confirmation */
  confirmation?: string;
  signerName: string;
  /** PNG data URL from the signature pad */
  signatureDataUrl: string;
  signedAt: Date;
  /** CSS font-family of the page (Poppins), so the document matches the site */
  fontFamily?: string;
  /** Re-encode with lower quality while the JPEG is larger than this */
  maxBytes?: number;
}

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

/** Parental consent of a minor, signed online on /bewerben. */
export function renderDeclarationDocument(
  input: DeclarationDocumentInput,
): Promise<{ data: string; size: number }> {
  return renderSignedDocument({
    tag: "Bewerbung · Einverständnis der Eltern",
    title: "Einverständniserklärung der Erziehungsberechtigten",
    source: "online abgegeben über www.swibble.net/bewerben",
    sections: [
      {
        heading: "1. Angaben zum Kind",
        lines: [`${input.childName}, geboren am ${input.birthDate}`],
      },
      {
        heading: "2. Erziehungsberechtigte Person",
        lines: [
          input.guardianName,
          input.guardianContact,
          input.guardianAddress,
        ].filter(Boolean),
      },
    ],
    declarationHeading: "3. Erklärung",
    declarationText: input.declarationText,
    signerName: input.guardianName,
    signatureDataUrl: input.signatureDataUrl,
    signedAt: input.signedAt,
    fontFamily: input.fontFamily,
  });
}

/** Returns the document as base64 JPEG (without the data: prefix). */
export async function renderSignedDocument(
  input: SignedDocumentInput,
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
    const tag = input.tag;
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
    paragraph(input.title, font(36, true), 48, 6);
    ctx.fillStyle = MUTED;
    paragraph(input.source, font(20), 28, 28);
    ctx.fillStyle = INK;

    for (const section of input.sections) {
      heading(section.heading);
      for (const line of section.lines) paragraph(line, font(22), 32, 0);
      y += 22;
    }

    heading(input.declarationHeading);
    for (const block of input.declarationText.split(/\n\n+/)) {
      paragraph(block, font(19), 29, 12);
    }
    y += 16;
    if (input.confirmation) {
      paragraph(`☑ ${input.confirmation}`, font(19), 29, 16);
    }

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
    paragraph(`Unterschrift: ${input.signerName}`, font(18), 26, 30);

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

  const encode = (quality: number) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
  let blob = await encode(0.85);
  for (const quality of [0.7, 0.55]) {
    if (!blob || !input.maxBytes || blob.size <= input.maxBytes) break;
    blob = await encode(quality);
  }
  if (!blob) throw new Error("document could not be rendered");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("document could not be read"));
    reader.readAsDataURL(blob);
  });

  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), size: blob.size };
}
