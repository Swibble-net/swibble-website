// Central settings for the application page (/bewerben). Everything that is a
// business or legal decision lives here so it can be changed in one place.

export const APPLICATION_ROLES = [
  { id: "video", label: "Im Video mitmachen" },
  { id: "promoter", label: "Promoter:in für Events" },
  { id: "model", label: "Model" },
  { id: "kamera", label: "Kamerabedienung" },
] as const;

export type ApplicationRole = (typeof APPLICATION_ROLES)[number]["id"];

/**
 * Both application pages store into the same applicant pool and show up in
 * /admin/bewerbungen; `pool` tells them apart. Documents without the field
 * come from /bewerben ("videos").
 */
export const APPLICATION_POOLS = [
  { id: "videos", label: "Center-Videos", path: "/bewerben" },
  { id: "creator", label: "Creator Pool", path: "/bewerben/creator" },
] as const;

export type ApplicationPool = (typeof APPLICATION_POOLS)[number]["id"];

/** Roles of the Swibble Creator Pool (/bewerben/creator) — always all open. */
export const CREATOR_ROLES = [
  { id: "model", label: "Model", icon: "📸", hint: "Shootings, Kampagnen, Videos" },
  { id: "creator", label: "Content Creator", icon: "🎬", hint: "TikTok, Reels, UGC" },
  { id: "moderation", label: "Moderation", icon: "🎤", hint: "Events, Bühne, Kamera" },
] as const;

export type CreatorRole = (typeof CREATOR_ROLES)[number]["id"];

/** Any role id that can be stored with an application. */
export type AnyApplicationRole = ApplicationRole | CreatorRole;

export const APPLICATION_STATUSES = [
  { id: "neu", label: "Neu" },
  { id: "kontaktiert", label: "Kontaktiert" },
  { id: "angenommen", label: "Angenommen" },
  { id: "abgelehnt", label: "Abgelehnt" },
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["id"];

/** Below this age the parental-consent section (incl. upload) is mandatory. */
export const ADULT_AGE = 18;

/**
 * Minimum age to apply at all. Decided: no lower limit (`null`) — anyone may
 * apply, only implausible birth dates are rejected. Everyone under ADULT_AGE
 * needs the parental consent section. Set a number to introduce a limit.
 */
export const MIN_APPLICATION_AGE: number | null = null;

/** Plausibility ceiling for the birth date. */
export const MAX_APPLICATION_AGE = 100;

/**
 * Retention: applications join the Swibble applicant pool and are kept until
 * the consent is withdrawn or deletion is requested. There is no expiry and no
 * automatic deletion — removal happens in the admin area ("Endgültig
 * löschen"). Texts must therefore never promise a fixed deletion period.
 */
export const WITHDRAWAL_EMAIL = "info@swibble.net";

/**
 * Shows a visible "ENTWURF" marker on the parental consent template
 * (/bewerben/einverstaendnis) and on the document generated from the online
 * signature. Switched off at the owner's request (2026-09); set to true to
 * bring the marker back, e.g. while the wording is being revised.
 */
export const CONSENT_TEMPLATE_IS_DRAFT = false;

export const ABOUT_MAX_LENGTH = 600;
export const NOTE_MAX_LENGTH = 2000;

/**
 * Upload budget. The whole request has to stay below Vercel's 4.5 MB function
 * body limit and files travel base64 encoded (+33 %):
 * consent file 1.7 MB + 5 photos × 300 KB ≈ 4.4 MB encoded. Images are
 * downscaled in the browser before upload.
 */
export const CONSENT_FILE_MAX_BYTES = Math.round(1.7 * 1024 * 1024);

/** Optional photos applicants may add of themselves. */
export const PHOTO_MAX_COUNT = 5;
export const PHOTO_MAX_BYTES = 300 * 1024;

/**
 * Wording of the consents, stored verbatim with every application together
 * with the timestamp. Bump the version whenever the text changes.
 */
export const CONSENT_VERSION = "2026-09-v3";

export const CONTACT_CONSENT_TEXT =
  "Ich bin damit einverstanden, dass Swibble meine Bewerbung in den Swibble-Bewerberpool aufnimmt und dort dauerhaft bis zu meinem Widerruf speichert, um mich auch für spätere Videos und Aktionen anfragen zu können. Swibble darf mich dazu per E-Mail, per Telefon/WhatsApp und über die von mir angegebenen Social-Media-Profile kontaktieren. Diese Einwilligung kann ich jederzeit per E-Mail an info@swibble.net widerrufen; meine Daten werden dann gelöscht.";

export const PRIVACY_ACK_TEXT =
  "Ich habe die Datenschutzerklärung zur Kenntnis genommen.";

/**
 * Publication / marketing release — mandatory for every applicant. Worded like
 * a model release: unlimited usage rights, no recall of published content,
 * withdrawal only for good cause. DRAFT — needs legal review, in particular
 * the restriction of withdrawal and its use towards minors.
 */
export const MEDIA_CONSENT_TEXT =
  "Ich bin damit einverstanden, dass Swibble und die jeweiligen Auftraggeber (z. B. das Einkaufszentrum) Foto-, Video- und Tonaufnahmen, die im Rahmen einer Zusammenarbeit von mir entstehen, zeitlich und räumlich unbegrenzt und ohne Vergütungsanspruch veröffentlichen, bearbeiten und für Marketing- und Werbezwecke nutzen dürfen – insbesondere auf TikTok, Instagram, YouTube, Websites und in Anzeigen. Bereits veröffentlichte Inhalte müssen nicht zurückgerufen oder gelöscht werden; ein Widerruf dieser Einwilligung ist nur aus wichtigem Grund und nur mit Wirkung für die Zukunft möglich.";

/**
 * Parental declaration — single source for the printable template, the online
 * signing step and the generated document. "{roles}" is replaced by the
 * selected activities. DRAFT — needs legal review.
 */
export const GUARDIAN_DECLARATION_INTRO =
  "Ich bin / Wir sind für das oben genannte Kind sorgeberechtigt und damit einverstanden, dass es sich bei der Swibble UG (haftungsbeschränkt), Königstraße 30, 52064 Aachen, bewirbt für: {roles}.";

export const GUARDIAN_DECLARATION_CLAUSES = [
  "Datenverarbeitung: Ich willige / Wir willigen – auch stellvertretend für mein / unser Kind – darin ein, dass Swibble die im Bewerbungsformular angegebenen Daten des Kindes (Name, Geburtsdatum, Wohnort, E-Mail-Adresse, Handynummer, Social-Media-Profilnamen, Freitext, freiwillig hochgeladene Fotos) sowie meine / unsere Kontaktdaten und diese Erklärung verarbeitet, in den Swibble-Bewerberpool aufnimmt und dort bis zum Widerruf speichert, um das Kind auch für spätere Videos und Aktionen anfragen zu können.",
  "Kontakt: Swibble darf das Kind sowie mich / uns dazu per E-Mail, Telefon/WhatsApp und über die angegebenen Social-Media-Profile kontaktieren.",
  "Veröffentlichung und Marketing: Ich bin / Wir sind damit einverstanden, dass Swibble und die jeweiligen Auftraggeber (z. B. das Einkaufszentrum) Foto-, Video- und Tonaufnahmen, die im Rahmen einer Zusammenarbeit von dem Kind entstehen, zeitlich und räumlich unbegrenzt und ohne Vergütungsanspruch veröffentlichen, bearbeiten und für Marketing- und Werbezwecke nutzen dürfen – insbesondere auf TikTok, Instagram, YouTube, Websites und in Anzeigen. Bereits veröffentlichte Inhalte müssen nicht zurückgerufen oder gelöscht werden; ein Widerruf dieser Einwilligung ist nur aus wichtigem Grund und nur mit Wirkung für die Zukunft möglich.",
  "Widerruf der Datenverarbeitung: Die Einwilligung in die Speicherung im Bewerberpool und in die Kontaktaufnahme ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden, z. B. per E-Mail an info@swibble.net; Swibble löscht dann die Bewerbungsdaten. Die Datenschutzhinweise unter www.swibble.net/datenschutz habe ich / haben wir zur Kenntnis genommen.",
  "Bei gemeinsamem Sorgerecht versichere ich, im Einvernehmen mit dem anderen Elternteil zu handeln.",
] as const;

/** Ticked by the guardian when signing online. */
export const GUARDIAN_ONLINE_ACCEPT_TEXT =
  "Ich bin erziehungsberechtigt, habe die Erklärung gelesen und gebe sie mit meiner Unterschrift ab.";

/** Ticked by the applicant when a photo of the signed paper form is uploaded. */
export const GUARDIAN_CONFIRM_TEXT =
  "Meine Eltern bzw. Erziehungsberechtigten wissen von dieser Bewerbung. Sie sind mit der Bewerbung, mit der Speicherung und Verarbeitung meiner Daten im Swibble-Bewerberpool, mit der Veröffentlichung von Aufnahmen und damit einverstanden, dass Swibble auch sie kontaktiert – das bestätigen sie mit der hochgeladenen Einverständniserklärung.";

export const GUARDIAN_METHODS = ["signature", "upload"] as const;
export type GuardianMethod = (typeof GUARDIAN_METHODS)[number];

/** The declaration as plain text, as stored with an online-signed application. */
export function guardianDeclarationText(roleIds: readonly string[]): string {
  const roles = roleIds.map(roleLabel).join(", ");
  return [
    GUARDIAN_DECLARATION_INTRO.replace("{roles}", roles),
    ...GUARDIAN_DECLARATION_CLAUSES.map((clause, i) => `${i + 1}. ${clause}`),
  ].join("\n\n");
}

export function roleLabel(id: string): string {
  return (
    APPLICATION_ROLES.find((r) => r.id === id)?.label ??
    CREATOR_ROLES.find((r) => r.id === id)?.label ??
    id
  );
}

export function poolLabel(id: string): string {
  return APPLICATION_POOLS.find((p) => p.id === id)?.label ?? id;
}

/* ── Swibble Creator Pool (/bewerben/creator) ─────────────────────────── */

/**
 * The creator pool is for adults only: applicants sign the release
 * themselves. Younger people are pointed to /bewerben, where parents sign.
 */
export const CREATOR_MIN_AGE = 18;

/** At least this many photos; the upper limit is PHOTO_MAX_COUNT. */
export const CREATOR_PHOTO_MIN_COUNT = 1;

/**
 * Optional setcard / portfolio as PDF or image. Large PDFs are rebuilt from
 * page images in the browser until they fit. Budget per request (base64,
 * +33 %): 5 photos × 300 KB + setcard 1 MB + signed release ≤ 600 KB ≈ 4.1 MB.
 */
export const SETCARD_MAX_BYTES = 1024 * 1024;
export const RELEASE_FILE_MAX_BYTES = 600 * 1024;

export const PORTFOLIO_URL_MAX_LENGTH = 300;

export const CREATOR_CONSENT_VERSION = "2026-10-creator-v1";

/**
 * Release the creator signs online. Single source for the signing step, the
 * generated document, the stored text and the confirmation mail. "{name}" and
 * "{roles}" are filled in. DRAFT — needs legal review.
 */
export const CREATOR_RELEASE_INTRO =
  "Ich, {name}, möchte in den Swibble Creator Pool der Swibble UG (haftungsbeschränkt), Königstraße 30, 52064 Aachen, aufgenommen werden – als: {roles}. Dazu erkläre ich:";

export const CREATOR_RELEASE_CLAUSES = [
  "Vorstellung bei Kunden: Swibble darf mich als „Swibble Creator“ bestehenden und möglichen Kunden vorstellen und mich für Aufträge vorschlagen. Dafür darf Swibble meinen Namen, mein Alter, meinen Wohnort (Stadt), meine Fotos, meine Social-Media-Profile samt Reichweite sowie meine Setcard bzw. mein Portfolio an diese Kunden weitergeben, z. B. in Angeboten, Präsentationen und Creator-Übersichten. Meine Telefonnummer und E-Mail-Adresse gibt Swibble nur nach Rücksprache mit mir weiter.",
  "Werbung mit mir als Swibble Creator: Swibble darf mich als Teil des Swibble-Creator-Netzwerks zeigen und dafür meinen Namen, meine Fotos und meine Social-Media-Profile auf der eigenen Website, in den eigenen Social-Media-Kanälen, in Pitch-Decks und in sonstigem Werbematerial verwenden und verlinken.",
  "Rechte an Fotos und Unterlagen: Ich versichere, dass die hochgeladenen Fotos mich zeigen und dass ich sie sowie meine Setcard bzw. mein Portfolio für diese Zwecke nutzen und weitergeben darf (z. B. mit Zustimmung der Fotografin bzw. des Fotografen).",
  "Aufträge: Die Aufnahme in den Creator Pool verpflichtet weder mich noch Swibble zu einer Zusammenarbeit. Für jeden konkreten Auftrag – einschließlich Vergütung und Nutzungsrechten an den dabei entstehenden Inhalten – treffen wir eine eigene Vereinbarung.",
  "Speicherung und Kontakt: Swibble speichert meine Angaben, Fotos, Unterlagen und diese Erklärung im Creator Pool bis zu meinem Widerruf und darf mich per E-Mail, Telefon/WhatsApp und über meine Social-Media-Profile kontaktieren.",
  "Widerruf: Ich kann diese Erklärung jederzeit mit Wirkung für die Zukunft widerrufen, z. B. per E-Mail an info@swibble.net. Swibble nimmt mich dann aus dem Creator Pool, löscht meine Daten, entfernt mich von der eigenen Website und verwendet mich nicht mehr in neuen Präsentationen oder Werbemitteln. Bereits an Kunden verschickte Unterlagen und bereits veröffentlichte Social-Media-Beiträge müssen nicht zurückgerufen werden.",
] as const;

/** Ticked by the creator next to the signature field. */
export const CREATOR_RELEASE_ACCEPT_TEXT =
  "Ich habe die Erklärung gelesen und gebe sie mit meiner Unterschrift ab.";

/** The release as plain text, as signed and stored with the application. */
export function creatorReleaseText(
  name: string,
  roleIds: readonly string[],
): string {
  const roles = roleIds.length > 0 ? roleIds.map(roleLabel).join(", ") : "–";
  return [
    CREATOR_RELEASE_INTRO.replace("{name}", name.trim() || "–").replace(
      "{roles}",
      roles,
    ),
    ...CREATOR_RELEASE_CLAUSES.map((clause, i) => `${i + 1}. ${clause}`),
  ].join("\n\n");
}

export function statusLabel(id: string): string {
  return APPLICATION_STATUSES.find((s) => s.id === id)?.label ?? id;
}
