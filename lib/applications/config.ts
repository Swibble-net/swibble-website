// Central settings for the application page (/bewerben). Everything that is a
// business or legal decision lives here so it can be changed in one place.

export const APPLICATION_ROLES = [
  { id: "video", label: "Im Video mitmachen" },
  { id: "promoter", label: "Promoter:in" },
  { id: "model", label: "Model" },
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
 * Upload limit for the parental consent file. The whole request has to stay
 * below Vercel's ~4.5 MB function body limit, and the file travels base64
 * encoded (+33 %), so 3 MB is the practical maximum. Photos are downscaled in
 * the browser before upload.
 */
export const CONSENT_FILE_MAX_BYTES = 3 * 1024 * 1024;

/**
 * Wording of the consents, stored verbatim with every application together
 * with the timestamp. Bump the version whenever the text changes.
 */
export const CONSENT_VERSION = "2026-09-v2";

export const CONTACT_CONSENT_TEXT =
  "Ich bin damit einverstanden, dass Swibble meine Bewerbung in den Swibble-Bewerberpool aufnimmt und dort dauerhaft bis zu meinem Widerruf speichert, um mich auch für spätere Videos und Aktionen anfragen zu können. Swibble darf mich dazu per E-Mail, per Telefon/WhatsApp und über die von mir angegebenen Social-Media-Profile kontaktieren. Diese Einwilligung kann ich jederzeit per E-Mail an info@swibble.net widerrufen; meine Daten werden dann gelöscht.";

export const PRIVACY_ACK_TEXT =
  "Ich habe die Datenschutzerklärung zur Kenntnis genommen.";

export const GUARDIAN_CONFIRM_TEXT =
  "Meine Eltern bzw. Erziehungsberechtigten wissen von dieser Bewerbung. Sie sind mit der Bewerbung, mit der Speicherung und Verarbeitung meiner Daten im Swibble-Bewerberpool und damit einverstanden, dass Swibble auch sie kontaktiert – das bestätigen sie mit der hochgeladenen Einverständniserklärung.";

export function roleLabel(id: string): string {
  return APPLICATION_ROLES.find((r) => r.id === id)?.label ?? id;
}

export function statusLabel(id: string): string {
  return APPLICATION_STATUSES.find((s) => s.id === id)?.label ?? id;
}
