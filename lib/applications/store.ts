import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  getDb,
  getPrivateBucket,
  isFirebaseConfigured,
  isStorageConfigured,
} from "@/lib/firebaseAdmin";
import { getAllProfiles } from "@/lib/linkhub/profiles";
import { APPLICATION_STATUSES, type ApplicationStatus } from "./config";
import type { ConsentFileType } from "./fileType";
import type { Application, ApplicationConsentFile } from "./types";

const COLLECTION = "applications";
const CONSENT_FILE_PREFIX = "applications/consents";

export type ApplicationDocument = Omit<Application, "id">;

export interface ConsentUpload {
  buffer: Buffer;
  type: ConsentFileType;
}

export interface StoredConsentFile {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

export interface CenterOption {
  slug: string;
  name: string;
}

export interface ApplicationPatch {
  status?: ApplicationStatus;
  note?: string;
}

interface Backend {
  canStore(): boolean;
  canUpload(): boolean;
  create(doc: ApplicationDocument, upload: ConsentUpload | null): Promise<Application>;
  list(): Promise<Application[]>;
  get(id: string): Promise<Application | null>;
  update(id: string, patch: ApplicationPatch): Promise<Application | null>;
  remove(id: string): Promise<boolean>;
  readFile(file: ApplicationConsentFile): Promise<Buffer | null>;
  centers(): Promise<CenterOption[]>;
}

/** Fills defaults so older or partial documents never break the admin UI. */
export function toApplication(
  id: string,
  data: Partial<ApplicationDocument>,
): Application {
  const status = APPLICATION_STATUSES.some((s) => s.id === data.status)
    ? (data.status as ApplicationStatus)
    : "neu";

  return {
    id,
    roles: data.roles ?? [],
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    birthDate: data.birthDate ?? "",
    postalCode: data.postalCode ?? "",
    city: data.city ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    socials: {
      tiktok: data.socials?.tiktok ?? "",
      instagram: data.socials?.instagram ?? "",
      snapchat: data.socials?.snapchat ?? "",
      youtube: data.socials?.youtube ?? "",
    },
    about: data.about ?? "",
    center: data.center ?? "",
    centerName: data.centerName ?? "",
    guardian: data.guardian ?? null,
    isMinor: data.isMinor ?? false,
    ageAtSubmission: data.ageAtSubmission ?? 0,
    consent: {
      contactText: data.consent?.contactText ?? "",
      privacyText: data.consent?.privacyText ?? "",
      version: data.consent?.version ?? "",
      givenAt: data.consent?.givenAt ?? 0,
    },
    consentFile: data.consentFile ?? null,
    status,
    note: data.note ?? "",
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

function newConsentFilePath(type: ConsentFileType): string {
  // Random name: nothing about the applicant leaks into the object path.
  return `${CONSENT_FILE_PREFIX}/${crypto.randomUUID()}.${type.extension}`;
}

function consentFileMeta(upload: ConsentUpload): ApplicationConsentFile {
  return {
    path: newConsentFilePath(upload.type),
    contentType: upload.type.mime,
    extension: upload.type.extension,
    size: upload.buffer.length,
  };
}

/* ── Firestore + Firebase Storage ─────────────────────────────────────── */

const firebaseBackend: Backend = {
  canStore: () => isFirebaseConfigured(),
  canUpload: () => isStorageConfigured(),

  async create(doc, upload) {
    let consentFile: ApplicationConsentFile | null = null;

    // File first: an application of a minor must never exist without it.
    if (upload) {
      consentFile = consentFileMeta(upload);
      await getPrivateBucket()
        .file(consentFile.path)
        .save(upload.buffer, {
          resumable: false,
          contentType: consentFile.contentType,
          metadata: { cacheControl: "private, no-store" },
        });
    }

    const data: ApplicationDocument = { ...doc, consentFile };
    try {
      const ref = await getDb()
        .collection(COLLECTION)
        .add({ ...data, serverCreatedAt: FieldValue.serverTimestamp() });
      return toApplication(ref.id, data);
    } catch (error) {
      if (consentFile) {
        await getPrivateBucket()
          .file(consentFile.path)
          .delete({ ignoreNotFound: true })
          .catch(() => undefined);
      }
      throw error;
    }
  },

  async list() {
    const snapshot = await getDb()
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) =>
      toApplication(doc.id, doc.data() as Partial<ApplicationDocument>),
    );
  },

  async get(id) {
    const doc = await getDb().collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return toApplication(doc.id, doc.data() as Partial<ApplicationDocument>);
  },

  async update(id, patch) {
    const ref = getDb().collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return null;

    await ref.update({ ...patch, updatedAt: Date.now() });
    const updated = await ref.get();
    return toApplication(id, updated.data() as Partial<ApplicationDocument>);
  },

  async remove(id) {
    const ref = getDb().collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return false;

    // Delete the file before the document: if this fails, the record (and
    // with it the pointer to the file) is still there for another attempt.
    const { consentFile } = toApplication(
      id,
      existing.data() as Partial<ApplicationDocument>,
    );
    if (consentFile) {
      await getPrivateBucket()
        .file(consentFile.path)
        .delete({ ignoreNotFound: true });
    }

    await ref.delete();
    return true;
  },

  async readFile(file) {
    const [exists] = await getPrivateBucket().file(file.path).exists();
    if (!exists) return null;
    const [buffer] = await getPrivateBucket().file(file.path).download();
    return buffer;
  },

  async centers() {
    const profiles = await getAllProfiles();
    return profiles
      .filter((p) => p.showApplyLink)
      .map((p) => ({ slug: p.slug, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  },
};

/* ── In-memory backend for local development ──────────────────────────── */
// Opt-in via APPLICATIONS_DEV_STORE=memory and never active in production:
// lets the form and the admin area be tried out without Firebase credentials.

interface MemoryState {
  docs: Map<string, ApplicationDocument>;
  files: Map<string, Buffer>;
}

function memoryState(): MemoryState {
  // globalThis survives Next.js dev-server module reloads.
  const globalStore = globalThis as typeof globalThis & {
    __applicationsDevStore?: MemoryState;
  };
  globalStore.__applicationsDevStore ??= { docs: new Map(), files: new Map() };
  return globalStore.__applicationsDevStore;
}

const memoryBackend: Backend = {
  canStore: () => true,
  canUpload: () => process.env.APPLICATIONS_DEV_UPLOADS !== "off",

  async create(doc, upload) {
    const state = memoryState();
    const consentFile = upload ? consentFileMeta(upload) : null;
    if (upload && consentFile) state.files.set(consentFile.path, upload.buffer);

    const id = crypto.randomUUID();
    const data = { ...doc, consentFile };
    state.docs.set(id, data);
    return toApplication(id, data);
  },

  async list() {
    return [...memoryState().docs.entries()]
      .map(([id, data]) => toApplication(id, data))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async get(id) {
    const data = memoryState().docs.get(id);
    return data ? toApplication(id, data) : null;
  },

  async update(id, patch) {
    const state = memoryState();
    const data = state.docs.get(id);
    if (!data) return null;
    const next = { ...data, ...patch, updatedAt: Date.now() };
    state.docs.set(id, next);
    return toApplication(id, next);
  },

  async remove(id) {
    const state = memoryState();
    const data = state.docs.get(id);
    if (!data) return false;
    if (data.consentFile) state.files.delete(data.consentFile.path);
    state.docs.delete(id);
    return true;
  },

  async readFile(file) {
    return memoryState().files.get(file.path) ?? null;
  },

  async centers() {
    return [
      { slug: "demo-center", name: "Demo-Center (lokal)" },
      { slug: "test-plaza", name: "Test Plaza (lokal)" },
    ];
  },
};

function backend(): Backend {
  const useMemory =
    process.env.NODE_ENV !== "production" &&
    process.env.APPLICATIONS_DEV_STORE === "memory";
  return useMemory ? memoryBackend : firebaseBackend;
}

/* ── Public API ───────────────────────────────────────────────────────── */

/** True when applications can be persisted at all. */
export function isApplicationStoreAvailable(): boolean {
  return backend().canStore();
}

/** True when the private bucket for parental consent files is available. */
export function isConsentUploadAvailable(): boolean {
  return backend().canStore() && backend().canUpload();
}

export function createApplication(
  doc: ApplicationDocument,
  upload: ConsentUpload | null,
): Promise<Application> {
  return backend().create(doc, upload);
}

export async function listApplications(): Promise<Application[]> {
  if (!isApplicationStoreAvailable()) return [];
  return backend().list();
}

export async function getApplication(id: string): Promise<Application | null> {
  if (!isApplicationStoreAvailable()) return null;
  return backend().get(id);
}

export function updateApplication(
  id: string,
  patch: ApplicationPatch,
): Promise<Application | null> {
  return backend().update(id, patch);
}

/** Permanently deletes an application including its consent file. */
export function deleteApplication(id: string): Promise<boolean> {
  return backend().remove(id);
}

export async function readConsentFile(
  application: Application,
): Promise<StoredConsentFile | null> {
  const file = application.consentFile;
  if (!file) return null;
  const buffer = await backend().readFile(file);
  if (!buffer) return null;
  return { buffer, contentType: file.contentType, extension: file.extension };
}

/** Centers selectable on /mitmachen: Linkhub profiles with the apply entry on. */
export async function getCenterOptions(): Promise<CenterOption[]> {
  if (!isApplicationStoreAvailable()) return [];
  return backend().centers();
}
