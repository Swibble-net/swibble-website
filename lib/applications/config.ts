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
 * Minimum age to apply at all. `null` = no lower limit (only plausibility is
 * checked). Set to a number (e.g. 14) to reject younger applicants.
 */
export const MIN_APPLICATION_AGE: number | null = null;

/** Plausibility ceiling for the birth date. */
export const MAX_APPLICATION_AGE = 100;

/**
 * How long applications are kept after the process is finished, in months.
 * Shown on /bewerben and in the privacy policy. Deletion itself is manual
 * (admin area → "Endgültig löschen").
 */
export const APPLICATION_RETENTION_MONTHS = 6;

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
export const CONSENT_VERSION = "2026-09-v1";

export const CONTACT_CONSENT_TEXT =
  "Ich bin damit einverstanden, dass Swibble mich zu meiner Bewerbung per E-Mail, per Telefon/WhatsApp und über die von mir angegebenen Social-Media-Profile kontaktiert. Diese Einwilligung kann ich jederzeit per E-Mail an info@swibble.net widerrufen.";

export const PRIVACY_ACK_TEXT =
  "Ich habe die Datenschutzerklärung zur Kenntnis genommen.";

export const GUARDIAN_CONFIRM_TEXT =
  "Meine Eltern bzw. Erziehungsberechtigten wissen von dieser Bewerbung und sind damit einverstanden, dass Swibble auch sie kontaktiert.";

export function roleLabel(id: string): string {
  return APPLICATION_ROLES.find((r) => r.id === id)?.label ?? id;
}

export function statusLabel(id: string): string {
  return APPLICATION_STATUSES.find((s) => s.id === id)?.label ?? id;
}
