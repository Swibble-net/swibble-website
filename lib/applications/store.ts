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
import type {
  Application,
  ApplicationConsentFile,
  ApplicationVideo,
} from "./types";

const COLLECTION = "applications";
const FILE_PREFIXES = {
  consent: "applications/consents",
  release: "applications/releases",
  setcard: "applications/setcards",
  photo: "applications/photos",
} as const;

/** Creator pool: files uploaded one by one after the application was stored. */
export const uploadFolder = (applicationId: string) =>
  `applications/files/${applicationId}/`;

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
  | { kind: "photo"; index: number }
  | { kind: "videoCover"; index: number };

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
  /** Internal fields (files, upload state); null deletes nothing, it stores null. */
  setFields(id: string, fields: Partial<ApplicationDocument>): Promise<void>;
  remove(id: string): Promise<boolean>;
  readFile(file: { path: string }): Promise<Buffer | null>;
  writeFile(path: string, buffer: Buffer, contentType: string): Promise<void>;
  fileSize(path: string): Promise<number | null>;
  /** Joins pieces into one object (any number) and deletes the pieces. */
  combine(chunks: string[], destination: string, contentType: string): Promise<void>;
  /** Short-lived link for files too large for a function response; null = stream */
  signedUrl(path: string, contentType: string): Promise<string | null>;
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
    videos: data.videos ?? [],
    incomplete: data.incomplete === true,
    pendingUpload: data.pendingUpload ?? null,
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
    "consentFile" | "releaseFile" | "setcardFile" | "photos" | "videos"
  >,
): Array<{ path: string }> {
  return [
    application.consentFile,
    application.releaseFile,
    application.setcardFile,
    ...application.photos,
    ...application.videos.flatMap((video) => [
      { path: video.path },
      ...(video.coverPath ? [{ path: video.coverPath }] : []),
    ]),
  ].filter((file): file is { path: string } => file !== null);
}

// Cloud Storage composes at most 32 objects per call.
const COMPOSE_LIMIT = 32;
// Same piece size as the browser uses (config.UPLOAD_CHUNK_BYTES).
const UPLOAD_CHUNK_BYTES_STORE = 4 * 1024 * 1024;

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

  async setFields(id, fields) {
    await getDb()
      .collection(COLLECTION)
      .doc(id)
      .update({ ...fields, updatedAt: Date.now() });
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
    // Pieces of an upload that never completed.
    await getPrivateBucket().deleteFiles({ prefix: uploadFolder(id), force: true });

    await ref.delete();
    return true;
  },

  async readFile(file) {
    const [exists] = await getPrivateBucket().file(file.path).exists();
    if (!exists) return null;
    const [buffer] = await getPrivateBucket().file(file.path).download();
    return buffer;
  },

  async writeFile(path, buffer, contentType) {
    await getPrivateBucket().file(path).save(buffer, {
      resumable: false,
      contentType,
      metadata: { cacheControl: "private, no-store" },
    });
  },

  async fileSize(path) {
    const file = getPrivateBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [metadata] = await file.getMetadata();
    return Number(metadata.size) || 0;
  },

  async combine(chunks, destination, contentType) {
    const bucket = getPrivateBucket();
    const target = bucket.file(destination);
    // More than 32 pieces: compose step by step into the destination.
    await bucket.combine(chunks.slice(0, COMPOSE_LIMIT).map((p) => bucket.file(p)), target);
    for (let start = COMPOSE_LIMIT; start < chunks.length; start += COMPOSE_LIMIT - 1) {
      const batch = chunks.slice(start, start + COMPOSE_LIMIT - 1).map((p) => bucket.file(p));
      await bucket.combine([target, ...batch], target);
    }
    await target.setMetadata({ contentType, cacheControl: "private, no-store" });
    await Promise.all(chunks.map((p) => bucket.file(p).delete({ ignoreNotFound: true })));
  },

  async signedUrl(path, contentType) {
    const [url] = await getPrivateBucket().file(path).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
      responseType: contentType,
    });
    return url;
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

  async setFields(id, fields) {
    const state = memoryState();
    const data = state.docs.get(id);
    if (data) state.docs.set(id, { ...data, ...fields, updatedAt: Date.now() });
  },

  async remove(id) {
    const state = memoryState();
    const data = state.docs.get(id);
    if (!data) return false;
    for (const file of applicationFiles(toApplication(id, data))) {
      state.files.delete(file.path);
    }
    for (const path of [...state.files.keys()]) {
      if (path.startsWith(uploadFolder(id))) state.files.delete(path);
    }
    state.docs.delete(id);
    return true;
  },

  async readFile(file) {
    return memoryState().files.get(file.path) ?? null;
  },

  async writeFile(path, buffer) {
    memoryState().files.set(path, buffer);
  },

  async fileSize(path) {
    return memoryState().files.get(path)?.length ?? null;
  },

  async combine(chunks, destination) {
    const { files } = memoryState();
    files.set(destination, Buffer.concat(chunks.map((p) => files.get(p) ?? Buffer.alloc(0))));
    for (const p of chunks) files.delete(p);
  },

  async signedUrl() {
    return null;
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
  if (target.kind === "videoCover") {
    const path = application.videos[target.index]?.coverPath;
    const buffer = path ? await backend().readFile({ path }) : null;
    return buffer ? { buffer, contentType: "image/jpeg", extension: "jpg" } : null;
  }
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

/** Raw bytes of a stored object (local dev store copies files this way). */
export function readApplicationObject(path: string): Promise<Buffer | null> {
  return backend().readFile({ path });
}

/** A video of an application: signed link (bucket) or the bytes (local dev). */
export async function applicationVideoSource(
  application: Application,
  index: number,
): Promise<{ kind: "redirect"; url: string } | { kind: "buffer"; buffer: Buffer; contentType: string } | null> {
  const video = application.videos[index];
  if (!video) return null;
  const url = await backend().signedUrl(video.path, video.contentType);
  if (url) return { kind: "redirect", url };
  const buffer = await backend().readFile(video);
  return buffer ? { kind: "buffer", buffer, contentType: video.contentType } : null;
}

/* ── Creator pool: staged uploads ──────────────────────────────────────── */

export type UploadSlot =
  | { kind: "photo"; index: number }
  | { kind: "release" }
  | { kind: "consent" }
  | { kind: "setcard"; extension: string }
  | { kind: "videoChunk"; index: number; chunk: number }
  | { kind: "videoCover"; index: number };

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function slotPath(applicationId: string, slot: UploadSlot): string {
  const base = uploadFolder(applicationId);
  switch (slot.kind) {
    case "photo":
      return `${base}photo-${slot.index}.jpg`;
    case "release":
      return `${base}release.jpg`;
    case "consent":
      return `${base}consent.jpg`;
    case "setcard":
      return `${base}setcard.${slot.extension}`;
    case "videoChunk":
      return `${base}video-${slot.index}/chunk-${String(slot.chunk).padStart(3, "0")}`;
    case "videoCover":
      return `${base}video-${slot.index}-cover.jpg`;
  }
}

export function saveApplicationUpload(
  applicationId: string,
  slot: UploadSlot,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  return backend().writeFile(slotPath(applicationId, slot), buffer, contentType);
}

/**
 * Checks that every announced file arrived, joins the video pieces and
 * stores the file list. The application counts as complete afterwards.
 */
export async function completeApplicationUpload(
  application: Application,
): Promise<{ ok: true; application: Application } | { ok: false; message: string }> {
  const store = backend();
  const pending = application.pendingUpload;
  if (!pending) return { ok: false, message: "Der Upload ist bereits abgeschlossen." };
  const id = application.id;
  const meta = async (
    path: string,
    contentType: ConsentFileType["mime"],
    extension: ConsentFileType["extension"],
  ): Promise<ApplicationConsentFile | null> => {
    const size = await store.fileSize(path);
    return size ? { path, contentType, extension, size } : null;
  };

  const photos: ApplicationConsentFile[] = [];
  for (let index = 0; index < pending.photos; index += 1) {
    const photo = await meta(slotPath(id, { kind: "photo", index }), "image/jpeg", "jpg");
    if (!photo) return { ok: false, message: `Foto ${index + 1} ist nicht angekommen.` };
    photos.push(photo);
  }

  const releaseFile = await meta(slotPath(id, { kind: "release" }), "image/jpeg", "jpg");
  if (!releaseFile) return { ok: false, message: "Die Unterschrift ist nicht angekommen." };

  let consentFile: ApplicationConsentFile | null = null;
  if (pending.consent) {
    consentFile = await meta(slotPath(id, { kind: "consent" }), "image/jpeg", "jpg");
    if (!consentFile) {
      return { ok: false, message: "Die Unterschrift deiner Eltern ist nicht angekommen." };
    }
  }

  let setcardFile: ApplicationConsentFile | null = null;
  if (pending.setcard) {
    for (const [extension, contentType] of [
      ["pdf", "application/pdf"],
      ["jpg", "image/jpeg"],
      ["png", "image/png"],
    ] as const) {
      setcardFile ??= await meta(slotPath(id, { kind: "setcard", extension }), contentType, extension);
    }
    if (!setcardFile) return { ok: false, message: "Die Setcard ist nicht angekommen." };
  }

  const videos: ApplicationVideo[] = [];
  for (const [index, announced] of pending.videos.entries()) {
    const chunks = Array.from(
      { length: Math.max(1, Math.ceil(announced.size / UPLOAD_CHUNK_BYTES_STORE)) },
      (_, chunk) => slotPath(id, { kind: "videoChunk", index, chunk }),
    );
    for (const chunk of chunks) {
      if ((await store.fileSize(chunk)) === null) {
        return { ok: false, message: `Video ${index + 1} ist nicht vollständig angekommen.` };
      }
    }
    const path = `${uploadFolder(id)}video-${index}.${VIDEO_EXTENSIONS[announced.contentType] ?? "mp4"}`;
    await store.combine(chunks, path, announced.contentType);
    if ((await store.fileSize(path)) !== announced.size) {
      return { ok: false, message: `Video ${index + 1} ist nicht vollständig angekommen.` };
    }
    const coverPath = slotPath(id, { kind: "videoCover", index });
    videos.push({
      path,
      contentType: announced.contentType,
      size: announced.size,
      coverPath: (await store.fileSize(coverPath)) ? coverPath : "",
    });
  }

  await store.setFields(id, {
    photos,
    releaseFile,
    consentFile,
    setcardFile,
    videos,
    incomplete: false,
    pendingUpload: null,
  });
  const updated = await store.get(id);
  return updated ? { ok: true, application: updated } : { ok: false, message: "Nicht gefunden." };
}

/** Centers selectable on /bewerben: Linkhub profiles with the apply entry on. */
export async function getCenterOptions(): Promise<CenterOption[]> {
  if (!isApplicationStoreAvailable()) return [];
  return backend().centers();
}
