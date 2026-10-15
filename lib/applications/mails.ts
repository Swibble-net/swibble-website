// Mails around an application, in the Swibble look (lib/contact/mailLayout,
// which HTML-escapes every value). Pure functions, no I/O.
//
// Data minimisation: the applicant and guardian mails repeat the consents and
// what was applied for, but no phone numbers, birth date, address or files —
// an address typed wrongly must not leak more than necessary.

import { EMAIL } from "@/lib/cta";
import { SITE_URL, renderMailHtml, type MailContent } from "@/lib/contact/mailLayout";
import { APPLICATION_POOLS, roleLabel } from "./config";
import type { Application } from "./types";

export interface BuiltMail {
  subject: string;
  text: string;
  html: string;
}

const ADDRESS_LINE = "Swibble · Königstraße 30 · 52064 Aachen";

/** Plain-text twin of the HTML layout. */
function renderText(content: MailContent): string {
  return [
    content.heading,
    "",
    content.intro,
    "",
    content.rowsLabel.toUpperCase(),
    ...content.rows.map((row) => `${row.label}: ${row.value}`),
    ...(content.message
      ? ["", content.messageLabel.toUpperCase(), content.message]
      : []),
    "",
    content.ctaIntro,
    `${content.cta.label}: ${content.cta.href}`,
    "",
    ...content.closing,
    "",
    "--",
    ADDRESS_LINE,
    `${EMAIL} · ${SITE_URL}`,
    "",
    content.footerNote,
    "",
  ].join("\n");
}

function build(content: MailContent, logoSrc?: string): BuiltMail {
  return {
    subject: content.title,
    text: renderText(content),
    html: renderMailHtml(content, logoSrc),
  };
}

const roles = (a: Application) => a.roles.map((id) => roleLabel(id, a.pool)).join(", ");
const center = (a: Application) => a.centerName || "kein bestimmtes Center";
/** swibble.net/bewerben or swibble.net/bewerben/creator */
const formUrl = (a: Application) =>
  `swibble.net${APPLICATION_POOLS.find((p) => p.id === a.pool)?.path ?? "/bewerben"}`;

/** Confirmation for a creator pool applicant, with the signed release. */
function buildCreatorApplicantMail(a: Application, logoSrc?: string): BuiltMail {
  return build(
    {
      title: "Deine Bewerbung für den Swibble Creator Pool ist angekommen",
      heading: `Danke für deine Bewerbung, ${a.firstName}!`,
      intro:
        "Deine Bewerbung für den Swibble Creator Pool ist bei uns angekommen. Wir schauen uns dein Profil in Ruhe an und melden uns bei dir – per E-Mail, WhatsApp oder über deine Kanäle –, sobald es passt.",
      rowsLabel: "Deine Bewerbung",
      rows: [
        { label: "Beworben als", value: roles(a) },
        { label: "Name", value: `${a.firstName} ${a.lastName}` },
        { label: "Fotos", value: `${a.photos.length} hochgeladen` },
        ...(a.setcardFile ? [{ label: "Setcard", value: "hochgeladen" }] : []),
        ...(a.portfolioUrl ? [{ label: "Portfolio", value: a.portfolioUrl }] : []),
      ],
      messageLabel: "Deine unterschriebene Erklärung",
      message: a.consent.creatorRelease,
      ctaIntro: "In der Zwischenzeit: Schau dir an, was wir so machen.",
      cta: { href: SITE_URL, label: "Mehr über Swibble" },
      closing: ["Viele Grüße", "Dein Swibble-Team"],
      footerNote: `Du erhältst diese E-Mail, weil über ${formUrl(a)} eine Bewerbung mit deiner E-Mail-Adresse abgeschickt wurde. Du möchtest sie zurückziehen oder das warst nicht du? Schreib an ${EMAIL} – dann löschen wir die Bewerbung.`,
    },
    logoSrc,
  );
}

/** Confirmation for the applicant (Du-Form). */
export function buildApplicantMail(a: Application, logoSrc?: string): BuiltMail {
  if (a.pool === "creator") return buildCreatorApplicantMail(a, logoSrc);

  const consents = [
    `Kontakt & Bewerberpool: ${a.consent.contactText}`,
    a.consent.mediaText ? `Veröffentlichung: ${a.consent.mediaText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return build(
    {
      title: "Deine Bewerbung bei Swibble ist angekommen",
      heading: `Danke für deine Bewerbung, ${a.firstName}!`,
      intro: a.isMinor
        ? "Deine Bewerbung ist bei uns angekommen, zusammen mit dem Einverständnis deiner Eltern. Wir schauen uns alles in Ruhe an – wenn es passt, melden wir uns bei dir und deinen Eltern."
        : "Deine Bewerbung ist bei uns angekommen. Wir schauen uns alles in Ruhe an – wenn es passt, melden wir uns bei dir per E-Mail, WhatsApp oder über dein Profil.",
      rowsLabel: "Deine Bewerbung",
      rows: [
        { label: "Beworben als", value: roles(a) },
        { label: "Center", value: center(a) },
        { label: "Name", value: `${a.firstName} ${a.lastName}` },
        ...(a.photos.length > 0
          ? [{ label: "Fotos", value: `${a.photos.length} hochgeladen` }]
          : []),
      ],
      messageLabel: "Deine Einwilligungen",
      message: consents,
      ctaIntro:
        "In der Zwischenzeit: Schau dir an, was wir für die Center so drehen.",
      cta: a.center
        ? { href: `${SITE_URL}/linkhub/${a.center}`, label: `Zu ${a.centerName || "deinem Center"}` }
        : { href: SITE_URL, label: "Mehr über Swibble" },
      closing: ["Viele Grüße", "Dein Swibble-Team"],
      footerNote: `Du erhältst diese E-Mail, weil über swibble.net/bewerben eine Bewerbung mit deiner E-Mail-Adresse abgeschickt wurde. Du möchtest sie zurückziehen oder das warst nicht du? Schreib an ${EMAIL} – dann löschen wir die Bewerbung.`,
    },
    logoSrc,
  );
}

/** Confirmation for the guardian of a minor (Sie-Form); null without an e-mail address. */
export function buildGuardianMail(a: Application, logoSrc?: string): BuiltMail | null {
  if (!a.isMinor || !a.guardian?.email) return null;

  const signedOnline = a.guardian.method === "signature";

  return build(
    {
      title: `Bewerbung von ${a.firstName} bei Swibble – Ihr Einverständnis`,
      heading: `Guten Tag ${a.guardian.name},`,
      intro: signedOnline
        ? `${a.firstName} ${a.lastName} hat sich bei Swibble beworben, und Sie haben dazu online Ihr Einverständnis als erziehungsberechtigte Person gegeben. Zur Bestätigung finden Sie hier noch einmal die Erklärung im Wortlaut.`
        : `${a.firstName} ${a.lastName} hat sich bei Swibble beworben und dazu eine von Ihnen unterschriebene Einverständniserklärung hochgeladen. Sie wurden dabei als erziehungsberechtigte Person angegeben.`,
      rowsLabel: "Die Bewerbung",
      rows: [
        { label: "Kind", value: `${a.firstName} ${a.lastName}` },
        { label: "Beworben als", value: roles(a) },
        { label: "Center", value: center(a) },
        {
          label: "Einverständnis",
          value: signedOnline
            ? "online unterschrieben"
            : "unterschriebenes Formular hochgeladen",
        },
      ],
      messageLabel: "Ihre Erklärung",
      message: signedOnline ? a.consent.guardianDeclaration : "",
      ctaIntro:
        "Wer wir sind und was wir für Einkaufszentren produzieren, sehen Sie auf unserer Website.",
      cta: { href: SITE_URL, label: "Swibble kennenlernen" },
      closing: ["Freundliche Grüße", "Ihr Swibble-Team"],
      footerNote: `Sie erhalten diese E-Mail, weil Ihre E-Mail-Adresse bei einer Bewerbung über swibble.net/bewerben als Kontakt der erziehungsberechtigten Person angegeben wurde. Sie sind nicht einverstanden, möchten Ihr Einverständnis widerrufen oder wissen nichts davon? Schreiben Sie an ${EMAIL} – wir löschen die Bewerbung dann umgehend.`,
    },
    logoSrc,
  );
}

/** Internal notification: name, roles, center and the admin link — nothing else. */
export function buildInternalMail(
  a: Application,
  adminUrl: string,
  logoSrc?: string,
): BuiltMail {
  const creator = a.pool === "creator";
  return build(
    {
      title: creator
        ? `Neue Creator-Bewerbung: ${a.firstName} ${a.lastName} (${roles(a)})`
        : `Neue Bewerbung: ${a.firstName} ${a.lastName} (${roles(a)})`,
      heading: creator
        ? "Neue Bewerbung für den Creator Pool"
        : "Neue Bewerbung eingegangen",
      intro: `Über ${formUrl(a)} ist eine neue Bewerbung eingegangen. Alle Angaben, Fotos und Einwilligungen findest du im Admin-Bereich.`,
      rowsLabel: "Kurzüberblick",
      rows: creator
        ? [
            { label: "Name", value: `${a.firstName} ${a.lastName}` },
            { label: "Bewirbt sich als", value: roles(a) },
            { label: "Fotos", value: String(a.photos.length) },
            { label: "Setcard", value: a.setcardFile ? "ja" : "nein" },
          ]
        : [
            { label: "Name", value: `${a.firstName} ${a.lastName}` },
            { label: "Bewirbt sich als", value: roles(a) },
            { label: "Center", value: center(a) },
            { label: "Minderjährig", value: a.isMinor ? "ja" : "nein" },
          ],
      messageLabel: "",
      message: "",
      ctaIntro: "Kontaktdaten und Dateien stehen bewusst nicht in dieser E-Mail.",
      cta: { href: adminUrl, label: "Bewerbung im Admin-Bereich öffnen" },
      closing: [],
      footerNote:
        "Automatische Benachrichtigung der Swibble-Website bei neuen Bewerbungen.",
    },
    logoSrc,
  );
}
