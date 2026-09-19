// Confirmation mail for the visitor: repeats the inquiry in the Swibble look.
// Pure functions (no I/O). Every visitor input is HTML-escaped before it reaches the markup.
import { CTA_URL, EMAIL, PHONE_DISPLAY, PHONE_TEL } from "@/lib/cta";
import { EMAIL_LOGO_HEIGHT, EMAIL_LOGO_PNG_BASE64, EMAIL_LOGO_WIDTH } from "@/lib/contact/emailLogo";
import { BUDGETS, GOALS, SERVICES, TIMEFRAMES, labelOf } from "@/lib/contact/funnel";
import { cleanLine, type Inquiry } from "@/lib/contact/inquiry";

const SITE_URL = "https://www.swibble.net";

// The real logo (mark + white wordmark) as an inline image: mail clients do not render
// SVG, and a CID attachment also shows when remote images are blocked.
const LOGO_CID = "swibble-logo";
export const EMAIL_LOGO_ATTACHMENT = {
  filename: "swibble-logo.png",
  content: Buffer.from(EMAIL_LOGO_PNG_BASE64, "base64"),
  contentType: "image/png",
  cid: LOGO_CID,
};
/** For previews outside a mail client, where cid: references do not resolve. */
export const EMAIL_LOGO_DATA_URI = `data:image/png;base64,${EMAIL_LOGO_PNG_BASE64}`;

const PURPLE = "#B718EC";
const NAVY = "#000D36";
const TEXT = "#2A3342";
const MUTED = "#556987";
const TINT = "#FDF5FF";
const FONT = "'Poppins', 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** First name for the greeting; empty when no name was given. */
const firstName = (name: string) => name.split(" ")[0] ?? "";

/** The answers as label/value rows; optional answers without a value are left out. */
export function summaryRows(inquiry: Inquiry): { label: string; value: string }[] {
  return [
    { label: "Leistungen", value: inquiry.services.map((service) => labelOf(SERVICES, service)).join(", ") },
    { label: "Ziel", value: labelOf(GOALS, inquiry.goal) },
    { label: "Budgetrahmen", value: labelOf(BUDGETS, inquiry.budget) },
    { label: "Gewünschter Start", value: labelOf(TIMEFRAMES, inquiry.timeframe) },
    { label: "Name", value: inquiry.name },
    { label: "Unternehmen", value: inquiry.company },
    { label: "E-Mail", value: inquiry.email },
    { label: "Telefon", value: inquiry.number },
  ].filter((row) => row.value);
}

export function buildConfirmationSubject(): string {
  return "Deine Anfrage bei Swibble ist angekommen";
}

const greeting = (inquiry: Inquiry) => {
  const name = firstName(inquiry.name);
  return name ? `Danke für deine Anfrage, ${name}!` : "Danke für deine Anfrage!";
};

const INTRO =
  "Deine Anfrage ist bei uns angekommen – wir melden uns so schnell wie möglich bei dir. Hier noch einmal deine Angaben im Überblick.";
const CTA_INTRO = "Du möchtest nicht warten? Dann such dir direkt einen Termin für dein kostenloses Erstgespräch aus.";
const CTA_TEXT = "Jetzt Termin buchen";
const REASON =
  "Du erhältst diese E-Mail, weil über das Formular auf swibble.net eine Anfrage mit deiner E-Mail-Adresse gesendet wurde. Das warst nicht du? Dann kannst du diese E-Mail einfach ignorieren.";

export function buildConfirmationText(inquiry: Inquiry): string {
  return [
    greeting(inquiry),
    "",
    INTRO,
    "",
    "DEINE ANFRAGE",
    ...summaryRows(inquiry).map((row) => `${row.label}: ${row.value}`),
    ...(inquiry.message ? ["", "DEINE NACHRICHT", inquiry.message] : []),
    "",
    CTA_INTRO,
    `${CTA_TEXT}: ${CTA_URL}`,
    "",
    "Viele Grüße",
    "Dein Swibble-Team",
    "",
    "--",
    "Swibble · Königstraße 30 · 52064 Aachen",
    `${EMAIL} · ${PHONE_DISPLAY} · ${SITE_URL}`,
    "",
    REASON,
    "",
  ].join("\n");
}

const row = ({ label, value }: { label: string; value: string }) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #F0E6F4;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};width:38%;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:10px 0 10px 12px;border-bottom:1px solid #F0E6F4;font-family:${FONT};font-size:14px;line-height:20px;color:${TEXT};font-weight:600;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
              </tr>`;

// Table layout and inline styles only: the common denominator of mail clients.
export function buildConfirmationHtml(inquiry: Inquiry, logoSrc = `cid:${LOGO_CID}`): string {
  const message = inquiry.message
    ? `
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <p style="margin:0 0 8px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">Deine Nachricht</p>
              <p style="margin:0;padding:14px 16px;background:${TINT};border-left:4px solid ${PURPLE};border-radius:8px;font-family:${FONT};font-size:14px;line-height:22px;color:${TEXT};word-break:break-word;">${escapeHtml(inquiry.message).replace(/\r?\n/g, "<br>")}</p>
            </td>
          </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <title>${escapeHtml(buildConfirmationSubject())}</title>
</head>
<body style="margin:0;padding:0;background:${TINT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(cleanLine(INTRO))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${TINT};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 25px 100px rgba(76,64,247,0.08);">
          <tr>
            <td style="background:${NAVY};padding:24px 32px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${logoSrc}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" alt="Swibble" style="display:block;border:0;font-family:${FONT};font-size:24px;font-weight:700;color:#FFFFFF;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:${PURPLE};">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <h1 style="margin:0 0 12px 0;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;color:${NAVY};">${escapeHtml(greeting(inquiry))}</h1>
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:24px;color:${MUTED};">${escapeHtml(INTRO)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 16px 32px;">
              <p style="margin:0 0 4px 0;font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${PURPLE};">Deine Anfrage</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${summaryRows(inquiry).map(row).join("")}
              </table>
            </td>
          </tr>${message}
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <p style="margin:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:24px;color:${MUTED};">${escapeHtml(CTA_INTRO)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${PURPLE}" style="border-radius:16px;">
                    <a href="${CTA_URL}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;line-height:22px;font-weight:600;color:#F0FDF4;text-decoration:none;border-radius:16px;">${CTA_TEXT}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;">
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:24px;color:${TEXT};">Viele Grüße<br><strong>Dein Swibble-Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:${NAVY};padding:24px 32px;">
              <p style="margin:0 0 8px 0;font-family:${FONT};font-size:13px;line-height:20px;color:#FFFFFF;">
                Swibble · Königstraße 30 · 52064 Aachen<br>
                <a href="mailto:${EMAIL}" style="color:#FFFFFF;text-decoration:underline;">${EMAIL}</a> ·
                <a href="tel:${PHONE_TEL}" style="color:#FFFFFF;text-decoration:none;">${PHONE_DISPLAY}</a>
              </p>
              <p style="margin:0 0 12px 0;font-family:${FONT};font-size:13px;line-height:20px;">
                <a href="${SITE_URL}" style="color:#E7A1FF;text-decoration:underline;">swibble.net</a> ·
                <a href="${SITE_URL}/impressum" style="color:#E7A1FF;text-decoration:underline;">Impressum</a> ·
                <a href="${SITE_URL}/datenschutz" style="color:#E7A1FF;text-decoration:underline;">Datenschutz</a>
              </p>
              <p style="margin:0;font-family:${FONT};font-size:11px;line-height:17px;color:#9AA3BD;">${escapeHtml(REASON)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
