import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { APPLICATION_ROLES, type ApplicationRole } from "./config";

const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOCUMENT = "applications";

export interface ApplicationSettings {
  /** Roles applicants can currently choose on /bewerben, in display order. */
  enabledRoles: ApplicationRole[];
}

/**
 * Used until something is saved in the admin area. Decided (2026-10): only
 * "Im Video mitmachen" is open, the other roles are switched on when needed.
 */
export const DEFAULT_APPLICATION_SETTINGS: ApplicationSettings = {
  enabledRoles: ["video"],
};

/** Keeps known role ids only, in the order of APPLICATION_ROLES. */
export function normalizeEnabledRoles(value: unknown): ApplicationRole[] | null {
  if (!Array.isArray(value)) return null;
  const roles = APPLICATION_ROLES.map((r) => r.id).filter((id) =>
    value.includes(id),
  );
  return roles.length > 0 ? roles : null;
}

export async function getApplicationSettings(): Promise<ApplicationSettings> {
  if (!isFirebaseConfigured()) return DEFAULT_APPLICATION_SETTINGS;
  const snapshot = await getDb()
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOCUMENT)
    .get();
  return {
    enabledRoles:
      normalizeEnabledRoles(snapshot.data()?.enabledRoles) ??
      DEFAULT_APPLICATION_SETTINGS.enabledRoles,
  };
}

export async function updateApplicationSettings(
  settings: ApplicationSettings,
): Promise<ApplicationSettings> {
  const value = { enabledRoles: settings.enabledRoles };
  await getDb()
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOCUMENT)
    .set(value, { merge: true });
  return value;
}
