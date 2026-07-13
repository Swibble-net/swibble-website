import { FieldValue } from "firebase-admin/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { slugify } from "@/lib/blog/slug";
import type { LinkhubProfile, LinkhubProfileInput, LinkhubLink } from "./types";

const COLLECTION = "linkhubs";

interface ProfileDocument {
  slug: string;
  name: string;
  subtitle: string;
  logoUrl?: string;
  links: LinkhubLink[];
  createdAt: number;
  updatedAt: number;
}

function toProfile(id: string, data: ProfileDocument): LinkhubProfile {
  return {
    id,
    slug: data.slug ?? "",
    name: data.name ?? "",
    subtitle: data.subtitle ?? "",
    logoUrl: data.logoUrl ?? "",
    links: (data.links ?? []).map((l) => ({
      id: l.id ?? Math.random().toString(36).slice(2),
      icon: l.icon ?? "🔗",
      label: l.label ?? "",
      sublabel: l.sublabel ?? "",
      href: l.href ?? "",
      external: l.external ?? false,
      accent: l.accent ?? false,
    })),
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "profil";
  let candidate = root;

  for (let suffix = 2; ; suffix += 1) {
    const snapshot = await getDb()
      .collection(COLLECTION)
      .where("slug", "==", candidate)
      .limit(1)
      .get();
    const clash = snapshot.docs.find((doc) => doc.id !== ignoreId);
    if (!clash) return candidate;
    candidate = `${root}-${suffix}`;
  }
}

function normaliseLinks(
  input: LinkhubProfileInput["links"],
): LinkhubLink[] {
  return input.map((l) => ({
    id: l.id ?? Math.random().toString(36).slice(2),
    icon: l.icon.trim() || "🔗",
    label: l.label.trim(),
    sublabel: l.sublabel?.trim() ?? "",
    href: l.href.trim(),
    external: l.external ?? false,
    accent: l.accent ?? false,
  }));
}

export async function getAllProfiles(): Promise<LinkhubProfile[]> {
  if (!isFirebaseConfigured()) return [];

  const snapshot = await getDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) =>
    toProfile(doc.id, doc.data() as ProfileDocument),
  );
}

export async function getProfileBySlug(
  slug: string,
): Promise<LinkhubProfile | null> {
  if (!isFirebaseConfigured()) return null;

  const snapshot = await getDb()
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return toProfile(doc.id, doc.data() as ProfileDocument);
}

export async function getProfileById(
  id: string,
): Promise<LinkhubProfile | null> {
  if (!isFirebaseConfigured()) return null;

  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return toProfile(doc.id, doc.data() as ProfileDocument);
}

export async function createProfile(
  input: LinkhubProfileInput,
): Promise<LinkhubProfile> {
  const db = getDb();
  const now = Date.now();
  const slug = await uniqueSlug(input.slug || input.name);

  const data: ProfileDocument = {
    slug,
    name: input.name.trim(),
    subtitle: input.subtitle?.trim() ?? "",
    logoUrl: input.logoUrl?.trim() ?? "",
    links: normaliseLinks(input.links),
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(COLLECTION).add({
    ...data,
    serverCreatedAt: FieldValue.serverTimestamp(),
  });

  return toProfile(ref.id, data);
}

export async function updateProfile(
  id: string,
  input: LinkhubProfileInput,
): Promise<LinkhubProfile | null> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const current = existing.data() as ProfileDocument;
  const slug =
    input.slug && input.slug !== current.slug
      ? await uniqueSlug(input.slug, id)
      : current.slug;

  const data: ProfileDocument = {
    slug,
    name: input.name.trim(),
    subtitle: input.subtitle?.trim() ?? "",
    logoUrl: input.logoUrl?.trim() ?? "",
    links: normaliseLinks(input.links),
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  };

  await ref.update({ ...data });
  return toProfile(id, data);
}

export async function deleteProfile(id: string): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}
