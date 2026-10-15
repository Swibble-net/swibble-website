import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  getDb,
  getPrivateBucket,
  isFirebaseConfigured,
  isStorageConfigured,
} from "@/lib/firebaseAdmin";
import { getAllProfiles } from "@/lib/linkhub/profiles";
import {
  APPLICATION_POOLS,
  APPLICATION_STATUSES,
  type ApplicationPool,
  type ApplicationStatus,
} from "./config";
import type { ConsentFileType } from "./fileType";
import type { Application, ApplicationConsentFile } from "./types";

const COLLECTION = "applications";
const FILE_PREFIXES = {
  consent: "applications/consents",
  release: "applications/releases",
  setcard: "applications/setcards",
  photo: "applications/photos",
} as const;

export type ApplicationDocument = Omit<Application, "id">;

export interface ConsentUpload {
  buffer: Buffer;
  type: ConsentFileType;
}

/** Files that arrive with an application; all optional except by pool rules. */
export interface ApplicationUploads {
  /** Parental consent of a minor (/bewerben) */
  consent: ConsentUpload | null;
  /** Release signed online (/bewerben/creator) */
  release: ConsentUpload | null;
  /** Setcard / portfolio (/bewerben/creator) */
  setcard: ConsentUpload | null;
  photos: ConsentUpload[];
}

/** Which stored file of an application to read. */
export type ApplicationFileTarget =
  | { kind: "consent" }
  | { kind: "release" }
  | { kind: "setcard" }
  | { kind: "photo"; index: number };

export interface StoredConsentFile {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

export interface CenterOption {
  slug: string;
  name: string;
  /** Logo of the Linkhub profile; "" = none */
  logoUrl: string;
}

export interface ApplicationPatch {
  status?: ApplicationStatus;
  note?: string;
}

interface Backend {
  canStore(): boolean;
  canUpload(): boolean;
  create(
    doc: ApplicationDocument,
    uploads: ApplicationUploads,
  ): Promise<Application>;
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

  const pool: ApplicationPool = APPLICATION_POOLS.some((p) => p.id === data.pool)
    ? (data.pool as ApplicationPool)
    : "videos";

  return {
    id,
    pool,
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
    portfolioUrl: data.portfolioUrl ?? "",
    guardian: data.guardian
      ? {
          name: data.guardian.name ?? "",
          phone: data.guardian.phone ?? "",
          email: data.guardian.email ?? "",
          address: data.guardian.address ?? "",
          // Applications from before online signing were always uploads.
          method: data.guardian.method ?? "upload",
          confirmed: data.guardian.confirmed ?? false,
        }
      : null,
    isMinor: data.isMinor ?? false,
    ageAtSubmission: data.ageAtSubmission ?? 0,
    consent: {
      contactText: data.consent?.contactText ?? "",
      privacyText: data.consent?.privacyText ?? "",
      mediaText: data.consent?.mediaText ?? "",
      guardianText: data.consent?.guardianText ?? "",
      guardianDeclaration: data.consent?.guardianDeclaration ?? "",
      creatorRelease: data.consent?.creatorRelease ?? "",
      version: data.consent?.version ?? "",
      givenAt: data.consent?.givenAt ?? 0,
    },
    consentFile: data.consentFile ?? null,
    photos: data.photos ?? [],
    releaseFile: data.releaseFile ?? null,
    setcardFile: data.setcardFile ?? null,
    status,
    note: data.note ?? "",
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

/** Every stored file of an application (for deletion). */
export function applicationFiles(
  application: Pick<
    Application,
    "consentFile" | "releaseFile" | "setcardFile" | "photos"
  >,
): ApplicationConsentFile[] {
  return [
    application.consentFile,
    application.releaseFile,
    application.setcardFile,
    ...application.photos,
  ].filter((file): file is ApplicationConsentFile => file !== null);
}

function newFilePath(prefix: string, type: ConsentFileType): string {
  // Random name: nothing about the applicant leaks into the object path.
  return `${prefix}/${crypto.randomUUID()}.${type.extension}`;
}

function fileMeta(prefix: string, upload: ConsentUpload): ApplicationConsentFile {
  return {
    path: newFilePath(prefix, upload.type),
    contentType: upload.type.mime,
    extension: upload.type.extension,
    size: upload.buffer.length,
  };
}

/* ── Firestore + Firebase Storage ─────────────────────────────────────── */

const firebaseBackend: Backend = {
  canStore: () => isFirebaseConfigured(),
  canUpload: () => isStorageConfigured(),

  async create(doc, uploads) {
    const bucket = () => getPrivateBucket();
    const stored: ApplicationConsentFile[] = [];
    const save = async (prefix: string, item: ConsentUpload) => {
      const meta = fileMeta(prefix, item);
      await bucket().file(meta.path).save(item.buffer, {
        resumable: false,
        contentType: meta.contentType,
        metadata: { cacheControl: "private, no-store" },
      });
      stored.push(meta);
      return meta;
    };
    const cleanUp = () =>
      Promise.all(
        stored.map((meta) =>
          bucket()
            .file(meta.path)
            .delete({ ignoreNotFound: true })
            .catch(() => undefined),
        ),
      );

    const saveOptional = (prefix: string, item: ConsentUpload | null) =>
      item ? save(prefix, item) : Promise.resolve(null);

    try {
      // Files first: an application of a minor must never exist without the
      // consent file (nor a creator without the signed release), and no
      // document may point to files that don't exist.
      const consentFile = await saveOptional(FILE_PREFIXES.consent, uploads.consent);
      const releaseFile = await saveOptional(FILE_PREFIXES.release, uploads.release);
      const setcardFile = await saveOptional(FILE_PREFIXES.setcard, uploads.setcard);
      const photoFiles: ApplicationConsentFile[] = [];
      for (const photo of uploads.photos) {
        photoFiles.push(await save(FILE_PREFIXES.photo, photo));
      }

      const data: ApplicationDocument = {
        ...doc,
        consentFile,
        releaseFile,
        setcardFile,
        photos: photoFiles,
      };
      const ref = await getDb()
        .collection(COLLECTION)
        .add({ ...data, serverCreatedAt: FieldValue.serverTimestamp() });
      return toApplication(ref.id, data);
    } catch (error) {
      await cleanUp();
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

    // Delete the files before the document: if this fails, the record (and
    // with it the pointers to the files) is still there for another attempt.
    const application = toApplication(
      id,
      existing.data() as Partial<ApplicationDocument>,
    );
    for (const file of applicationFiles(application)) {
      await getPrivateBucket().file(file.path).delete({ ignoreNotFound: true });
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
      .map((p) => ({ slug: p.slug, name: p.name, logoUrl: p.logoUrl }))
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

  async create(doc, uploads) {
    const state = memoryState();
    const keep = (prefix: string, item: ConsentUpload) => {
      const meta = fileMeta(prefix, item);
      state.files.set(meta.path, item.buffer);
      return meta;
    };
    const keepOptional = (prefix: string, item: ConsentUpload | null) =>
      item ? keep(prefix, item) : null;

    const id = crypto.randomUUID();
    const data = {
      ...doc,
      consentFile: keepOptional(FILE_PREFIXES.consent, uploads.consent),
      releaseFile: keepOptional(FILE_PREFIXES.release, uploads.release),
      setcardFile: keepOptional(FILE_PREFIXES.setcard, uploads.setcard),
      photos: uploads.photos.map((photo) => keep(FILE_PREFIXES.photo, photo)),
    };
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
    for (const file of applicationFiles(toApplication(id, data))) {
      state.files.delete(file.path);
    }
    state.docs.delete(id);
    return true;
  },

  async readFile(file) {
    return memoryState().files.get(file.path) ?? null;
  },

  async centers() {
    return [
      { slug: "demo-center", name: "Demo-Center (lokal)", logoUrl: "" },
      { slug: "test-plaza", name: "Test Plaza (lokal)", logoUrl: "" },
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
  uploads: ApplicationUploads,
): Promise<Application> {
  return backend().create(doc, uploads);
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

/** Permanently deletes an application including all of its files. */
export function deleteApplication(id: string): Promise<boolean> {
  return backend().remove(id);
}

/** Reads one stored file of an application (consent, release, setcard, photo). */
export async function readApplicationFile(
  application: Application,
  target: ApplicationFileTarget,
): Promise<StoredConsentFile | null> {
  const file =
    target.kind === "photo"
      ? application.photos[target.index]
      : target.kind === "release"
        ? application.releaseFile
        : target.kind === "setcard"
          ? application.setcardFile
          : application.consentFile;
  if (!file) return null;
  const buffer = await backend().readFile(file);
  if (!buffer) return null;
  return { buffer, contentType: file.contentType, extension: file.extension };
}

/** Centers selectable on /bewerben: Linkhub profiles with the apply entry on. */
export async function getCenterOptions(): Promise<CenterOption[]> {
  if (!isApplicationStoreAvailable()) return [];
  return backend().centers();
}
