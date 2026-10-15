// Booking inquiries from a creator page (/creator/<slug>): validation and the
// two mails (to Swibble, confirmation to the sender). Pure functions — the
// layout (lib/contact/mailLayout) HTML-escapes every value. Inquiries are not
// stored, like the contact form: they exist as mail in the info@ mailbox.

import { EMAIL } from "@/lib/cta";
import { SITE_URL, renderMailHtml, type MailContent } from "@/lib/contact/mailLayout";
import { normalizeEmail, normalizePhone } from "@/lib/applications/validation";

export const INQUIRY_MESSAGE_MAX_LENGTH = 1000;

export interface CreatorInquiry {
  company: string;
  name: string;
  email: string;
  /** Optional, normalised (+49…) */
  phone: string;
  message: string;
}

export type InquiryErrors = Partial<Record<keyof CreatorInquiry, string>>;

const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f<>]/;

function line(value: unknown, max: number): string | null {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return text.length > max || FORBIDDEN_TEXT.test(text) ? null : text;
}

export function validateCreatorInquiry(
  input: unknown,
): { ok: true; value: CreatorInquiry } | { ok: false; errors: InquiryErrors } {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const errors: InquiryErrors = {};

  const company = line(raw.company, 100);
  if (!company) errors.company = "Bitte gib dein Unternehmen an.";
  const name = line(raw.name, 80);
  if (!name) errors.name = "Bitte gib deinen Namen an.";

  const email = normalizeEmail(raw.email);
  if (!email) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";

  const phoneInput = line(raw.phone, 30) ?? "";
  const phone = phoneInput ? normalizePhone(phoneInput) : "";
  if (phoneInput && !phone) errors.phone = "Bitte prüfe die Telefonnummer.";

  const message =
    typeof raw.message === "string" ? raw.message.trim().replace(/\r\n/g, "\n") : "";
  if (!message) errors.message = "Worum geht es? Ein, zwei Sätze reichen.";
  else if (message.length > INQUIRY_MESSAGE_MAX_LENGTH) {
    errors.message = `Bitte kürze deine Nachricht auf ${INQUIRY_MESSAGE_MAX_LENGTH} Zeichen.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { company: company!, name: name!, email, phone, message },
  };
}

export interface BuiltMail {
  subject: string;
  text: string;
  html: string;
}

function renderText(content: MailContent): string {
  return [
    content.heading,
    "",
    content.intro,
    "",
    content.rowsLabel.toUpperCase(),
    ...content.rows.map((row) => `${row.label}: ${row.value}`),
    ...(content.message ? ["", content.messageLabel.toUpperCase(), content.message] : []),
    "",
    content.ctaIntro,
    `${content.cta.label}: ${content.cta.href}`,
    "",
    ...content.closing,
    "",
    "--",
    "Swibble · Königstraße 30 · 52064 Aachen",
    `${EMAIL} · ${SITE_URL}`,
    "",
    content.footerNote,
    "",
  ].join("\n");
}

function build(content: MailContent, logoSrc?: string): BuiltMail {
  return { subject: content.title, text: renderText(content), html: renderMailHtml(content, logoSrc) };
}

/** A request from /creator without a specific person. */
export const GENERAL_INQUIRY_NAME = "Swibble Creator (allgemein)";

const rows = (inquiry: CreatorInquiry, creatorName: string) =>
  [
    { label: "Creator", value: creatorName },
    { label: "Unternehmen", value: inquiry.company },
    { label: "Name", value: inquiry.name },
    { label: "E-Mail", value: inquiry.email },
    { label: "Telefon", value: inquiry.phone },
  ].filter((row) => row.value);

/** To Swibble: everything needed to answer, reply goes to the sender. */
export function buildInquiryNotification(
  inquiry: CreatorInquiry,
  creator: { name: string; pageUrl: string; adminUrl: string },
  logoSrc?: string,
): BuiltMail {
  return build(
    {
      title: `Creator-Anfrage: ${creator.name} – ${inquiry.company}`,
      heading:
        creator.name === GENERAL_INQUIRY_NAME
          ? "Neue Anfrage für Swibble Creator"
          : `Neue Anfrage für ${creator.name}`,
      intro: `Über ${creator.pageUrl} ist eine Anfrage eingegangen. Antworten geht direkt an ${inquiry.name}.`,
      rowsLabel: "Anfrage",
      rows: rows(inquiry, creator.name),
      messageLabel: "Nachricht",
      message: inquiry.message,
      ctaIntro: "Creator-Seite im Admin-Bereich:",
      cta: { href: creator.adminUrl, label: "Im Admin öffnen" },
      closing: [],
      footerNote: "Automatische Benachrichtigung der Swibble-Website bei Creator-Anfragen.",
    },
    logoSrc,
  );
}

/** To the sender (Du-Form like the contact form). */
export function buildInquiryConfirmation(
  inquiry: CreatorInquiry,
  creator: { name: string; pageUrl: string },
  logoSrc?: string,
): BuiltMail {
  const firstName = inquiry.name.split(" ")[0] ?? "";
  return build(
    {
      title:
        creator.name === GENERAL_INQUIRY_NAME
          ? "Deine Creator-Anfrage ist angekommen"
          : `Deine Anfrage für ${creator.name} ist angekommen`,
      heading: firstName ? `Danke, ${firstName}!` : "Danke für deine Anfrage!",
      intro:
        creator.name === GENERAL_INQUIRY_NAME
          ? "Deine Anfrage ist bei uns angekommen. Wir melden uns schnellstmöglich mit passenden Creatorn bei dir."
          : `Deine Anfrage für ${creator.name} ist bei uns angekommen. Wir melden uns schnellstmöglich bei dir.`,
      rowsLabel: "Deine Anfrage",
      rows: rows(inquiry, creator.name),
      messageLabel: "Deine Nachricht",
      message: inquiry.message,
      ctaIntro: "Weitere Creator findest du hier:",
      cta: { href: `${SITE_URL}/creator`, label: "Alle Swibble Creator" },
      closing: ["Viele Grüße", "Dein Swibble-Team"],
      footerNote: `Du erhältst diese E-Mail, weil über ${creator.pageUrl} eine Anfrage mit deiner E-Mail-Adresse gesendet wurde. Das warst nicht du? Dann ignoriere diese E-Mail einfach oder schreib an ${EMAIL}.`,
    },
    logoSrc,
  );
}
