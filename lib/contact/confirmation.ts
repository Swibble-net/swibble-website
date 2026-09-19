// Confirmation mail for the visitor: repeats the inquiry in the Swibble look.
// Pure functions (no I/O). The layout (lib/contact/mailLayout) HTML-escapes every value.
import { CTA_URL, EMAIL, PHONE_DISPLAY } from "@/lib/cta";
import { BUDGETS, GOALS, SERVICES, TIMEFRAMES, labelOf } from "@/lib/contact/funnel";
import type { Inquiry } from "@/lib/contact/inquiry";
import { SITE_URL, renderMailHtml, type MailRow } from "@/lib/contact/mailLayout";

export { EMAIL_LOGO_ATTACHMENT, EMAIL_LOGO_DATA_URI, escapeHtml } from "@/lib/contact/mailLayout";

/** First name for the greeting; empty when no name was given. */
const firstName = (name: string) => name.split(" ")[0] ?? "";

/** The answers as label/value rows; optional answers without a value are left out. */
export function summaryRows(inquiry: Inquiry): MailRow[] {
  return [
    { label: "Leistungen", value: inquiry.services.map((service) => labelOf(SERVICES, service)).join(", ") },
    { label: "Ziele", value: inquiry.goals.map((goal) => labelOf(GOALS, goal)).join(", ") },
    { label: "Budgetrahmen", value: labelOf(BUDGETS, inquiry.budget) },
    { label: "Gewünschter Start", value: labelOf(TIMEFRAMES, inquiry.timeframe) },
    { label: "Name", value: inquiry.name },
    { label: "Unternehmen", value: inquiry.company },
    { label: "Stadt / Ort", value: inquiry.location },
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

export function buildConfirmationHtml(inquiry: Inquiry, logoSrc?: string): string {
  return renderMailHtml(
    {
      title: buildConfirmationSubject(),
      heading: greeting(inquiry),
      intro: INTRO,
      rowsLabel: "Deine Anfrage",
      rows: summaryRows(inquiry),
      messageLabel: "Deine Nachricht",
      message: inquiry.message,
      ctaIntro: CTA_INTRO,
      cta: { href: CTA_URL, label: CTA_TEXT },
      closing: ["Viele Grüße", "Dein Swibble-Team"],
      footerNote: REASON,
    },
    logoSrc,
  );
}
