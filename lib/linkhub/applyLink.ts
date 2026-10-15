import type { LinkhubLink, LinkhubProfile } from "./types";

export const APPLY_LINK_ID = "builtin-apply";
export const APPLY_LINK_DEFAULT_LABEL = "Jetzt bewerben";
export const APPLY_LINK_SUBLABEL = "Mach mit bei unseren Videos";
export const APPLY_LINK_LABEL_MAX_LENGTH = 60;

/**
 * Built-in "Swibble Creator werden" entry, leading to the creator pool
 * application. Off by default — except on the Swibble profile itself, where
 * it is on until switched off in the CMS.
 */
export const CREATOR_LINK_ID = "builtin-creator";
export const CREATOR_LINK_LABEL = "Swibble Creator werden";
export const CREATOR_LINK_SUBLABEL = "Models, Creator, Moderation & Promotion";
export const CREATOR_LINK_HREF = "/bewerben/creator";
export const CREATOR_LINK_DEFAULT_SLUG = "swibble";

/** Path of the application page, pre-filled with the center it came from. */
export function applyHref(slug: string): string {
  return slug ? `/bewerben?center=${encodeURIComponent(slug)}` : "/bewerben";
}

/**
 * The built-in "Jetzt bewerben" entry of a Linkhub profile, or null when the
 * profile has it switched off. Not stored in `links` — it is derived at render
 * time, so the target always follows the current slug.
 */
export function buildApplyLink(
  profile: Pick<LinkhubProfile, "slug" | "showApplyLink" | "applyLinkLabel">,
): LinkhubLink | null {
  if (!profile.showApplyLink) return null;

  return {
    id: APPLY_LINK_ID,
    icon: "🎬",
    label: profile.applyLinkLabel.trim() || APPLY_LINK_DEFAULT_LABEL,
    sublabel: APPLY_LINK_SUBLABEL,
    href: applyHref(profile.slug),
    external: false,
    accent: false,
  };
}

/** The built-in creator pool entry, or null when the profile has it off. */
export function buildCreatorLink(
  profile: Pick<LinkhubProfile, "showCreatorLink">,
): LinkhubLink | null {
  if (!profile.showCreatorLink) return null;
  return {
    id: CREATOR_LINK_ID,
    icon: "✨",
    label: CREATOR_LINK_LABEL,
    sublabel: CREATOR_LINK_SUBLABEL,
    href: CREATOR_LINK_HREF,
    external: false,
    accent: false,
  };
}

/** Whether a stored profile shows the creator entry (see CREATOR_LINK_DEFAULT_SLUG). */
export function resolveShowCreatorLink(
  stored: boolean | undefined,
  slug: string | undefined,
): boolean {
  return stored ?? slug === CREATOR_LINK_DEFAULT_SLUG;
}

export type ApplyFieldsResult =
  | {
      ok: true;
      showApplyLink?: boolean;
      applyLinkLabel?: string;
      showCreatorLink?: boolean;
    }
  | { ok: false; message: string };

/**
 * Validates the apply-entry fields of a CMS payload. Both are optional so
 * older clients that don't send them keep working.
 */
export function parseApplyFields(body: {
  showApplyLink?: unknown;
  applyLinkLabel?: unknown;
  showCreatorLink?: unknown;
}): ApplyFieldsResult {
  const { showApplyLink, applyLinkLabel, showCreatorLink } = body;

  if (showApplyLink !== undefined && typeof showApplyLink !== "boolean") {
    return { ok: false, message: "showApplyLink muss true oder false sein." };
  }
  if (showCreatorLink !== undefined && typeof showCreatorLink !== "boolean") {
    return { ok: false, message: "showCreatorLink muss true oder false sein." };
  }
  if (applyLinkLabel !== undefined && typeof applyLinkLabel !== "string") {
    return { ok: false, message: "Ungültiges Label für den Bewerben-Eintrag." };
  }
  if (
    typeof applyLinkLabel === "string" &&
    applyLinkLabel.trim().length > APPLY_LINK_LABEL_MAX_LENGTH
  ) {
    return {
      ok: false,
      message: `Das Label für den Bewerben-Eintrag darf höchstens ${APPLY_LINK_LABEL_MAX_LENGTH} Zeichen haben.`,
    };
  }

  return {
    ok: true,
    showApplyLink,
    applyLinkLabel: applyLinkLabel?.trim(),
    showCreatorLink,
  };
}
