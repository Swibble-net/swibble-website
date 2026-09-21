// Central settings for the application page (/bewerben). Everything that is a
// business or legal decision lives here so it can be changed in one place.

export const APPLICATION_ROLES = [
  { id: "video", label: "Im Video mitmachen" },
  { id: "promoter", label: "Promoter:in für Events" },
  { id: "model", label: "Model" },
  { id: "kamera", label: "Kamerabedienung" },
] as const;

export type ApplicationRole = (typeof APPLICATION_ROLES)[number]["id"];

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
 * The parental consent template (/bewerben/einverstaendnis) carries a visible
 * "ENTWURF" marker until it has been legally reviewed. Set to false afterwards.
 */
export const CONSENT_TEMPLATE_IS_DRAFT = true;

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
  return APPLICATION_ROLES.find((r) => r.id === id)?.label ?? id;
}

export function statusLabel(id: string): string {
  return APPLICATION_STATUSES.find((s) => s.id === id)?.label ?? id;
}
