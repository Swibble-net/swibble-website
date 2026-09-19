// HTML version of the inquiry mail Swibble receives, in the same look as the
// visitor's confirmation. Subject and plain text stay in lib/contact/inquiry.
import { SERVICES, labelOf } from "@/lib/contact/funnel";
import { summaryRows } from "@/lib/contact/confirmation";
import { buildSubject, type Inquiry } from "@/lib/contact/inquiry";
import { renderMailHtml } from "@/lib/contact/mailLayout";

export function buildNotificationHtml(inquiry: Inquiry, logoSrc?: string): string {
  const sender = [inquiry.name, inquiry.company && `(${inquiry.company})`].filter(Boolean).join(" ") || inquiry.email;

  return renderMailHtml(
    {
      title: buildSubject(inquiry),
      heading: `Neue Anfrage: ${inquiry.services.map((service) => labelOf(SERVICES, service)).join(", ")}`,
      intro: `${sender} hat über das Formular auf swibble.net eine Anfrage gesendet.`,
      rowsLabel: "Anfrage",
      rows: summaryRows(inquiry),
      messageLabel: "Nachricht",
      message: inquiry.message,
      ctaIntro: "Antworten auf diese E-Mail gehen direkt an die Adresse aus der Anfrage.",
      // isValidEmail allows no whitespace, quotes stay harmless: the layout escapes the href.
      cta: { href: `mailto:${inquiry.email}`, label: "Jetzt antworten" },
      closing: [],
      footerNote: "Automatische Benachrichtigung des Kontaktformulars. Der Absender bekommt automatisch eine Bestätigung mit denselben Angaben.",
    },
    logoSrc,
  );
}
