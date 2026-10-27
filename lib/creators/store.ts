import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  getDb,
  getPrivateBucket,
  isFirebaseConfigured,
  isStorageConfigured,
} from "@/lib/firebaseAdmin";
import { CREATOR_ROLES, type CreatorRole } from "@/lib/applications/config";
import { emptyProfileFacts, profileFactsOf } from "@/lib/applications/profileFacts";
import { readApplicationFile, readApplicationObject } from "@/lib/applications/store";
import type { Application } from "@/lib/applications/types";
import { isTrustedMediaUrl } from "@/lib/videos/appVideos";
import type { AppVideoJob } from "@/lib/videos/types";
import {
  defaultCreatorName,
  isValidSlug,
  slugBase,
  videoChunkCount,
} from "./config";
import { imageSize } from "./imageSize";
import type {
  CreatorPhoto,
  CreatorProfile,
  CreatorProfileInput,
  CreatorVideo,
} from "./types";

const COLLECTION = "creators";
const FOLDER = "creators";

type CreatorDocument = Omit<CreatorProfile, "id">;

export const newMediaId = () => crypto.randomBytes(9).toString("base64url");

/** Random end of a page URL ("karina-x7k2q"): surnames never appear in links. */
const slugSuffix = () =>
  Array.from(crypto.randomBytes(5), (byte) => "abcdefghijkmnpqrstuvwxyz23456789"[byte % 32]).join("");

interface Backend {
  available(): boolean;
  list(): Promise<CreatorProfile[]>;
  get(id: string): Promise<CreatorProfile | null>;
  create(doc: CreatorDocument): Promise<CreatorProfile>;
  /** Read-modify-write of one profile (a transaction in Firestore). */
  mutate(
    id: string,
    change: (profile: CreatorProfile) => CreatorDocument | null,
  ): Promise<CreatorProfile | null>;
  removeDoc(id: string): Promise<void>;
  writeFile(path: string, buffer: Buffer, contentType: string): Promise<void>;
  readFile(path: string): Promise<Buffer | null>;
  deleteFile(path: string): Promise<void>;
  deleteFolder(prefix: string): Promise<void>;
  combine(chunks: string[], destination: string, contentType: string): Promise<number>;
  /** Copies an object of the same bucket (no download through the function). */
  copy(source: string, destination: string): Promise<boolean>;
  /** Short-lived link for large files (videos) that don't fit a function response */
  signedUrl(path: string, contentType: string): Promise<string | null>;
}

/** Fills defaults so older or partial documents never break the pages. */
export function toCreator(id: string, data: Partial<CreatorDocument>): CreatorProfile {
  const roles = CREATOR_ROLES.map((r) => r.id).filter((role) =>
    (data.roles ?? []).includes(role),
  ) as CreatorRole[];
  return {
    id,
    applicationId: data.applicationId ?? "",
    consentConfirmedAt: data.consentConfirmedAt ?? 0,
    slug: data.slug ?? "",
    published: data.published === true,
    position: typeof data.position === "number" ? data.position : -1,
    name: data.name ?? "",
    roles,
    city: data.city ?? "",
    tagline: data.tagline ?? "",
    ...profileFactsOf(data),
    socials: {
      tiktok: data.socials?.tiktok ?? "",
      instagram: data.socials?.instagram ?? "",
      snapchat: data.socials?.snapchat ?? "",
      youtube: data.socials?.youtube ?? "",
    },
    // Off unless switched on in the CMS: creators are contacted through Swibble.
    publicSocials: (data.publicSocials ?? []).filter((p) =>
      ["instagram", "tiktok", "youtube", "snapchat"].includes(p),
    ),
    portfolioUrl: data.portfolioUrl ?? "",
    showPortfolio: data.showPortfolio === true,
    setcardPath: data.setcardPath ?? "",
    setcardType: data.setcardType ?? "",
    showSetcard: data.showSetcard === true,
    photos: (data.photos ?? []).map((photo) => ({
      ...photo,
      caption: photo.caption ?? "",
      hidden: photo.hidden === true,
    })),
    videos: (data.videos ?? []).map((video) => ({
      ...video,
      hidden: video.hidden === true,
      // Never render a stored URL that is not one of our own web copies.
      videoUrl: isTrustedMediaUrl(video.videoUrl) ? video.videoUrl : "",
      coverUrl: isTrustedMediaUrl(video.coverUrl) ? video.coverUrl : "",
    })),
    references: data.references ?? [],
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

function withoutId(profile: CreatorProfile): CreatorDocument {
  const { id: _id, ...doc } = profile;
  return doc;
}

/* ── Firestore + Firebase Storage ─────────────────────────────────────── */

const firebaseBackend: Backend = {
  available: () => isFirebaseConfigured() && isStorageConfigured(),

  async list() {
    const snapshot = await getDb().collection(COLLECTION).orderBy("createdAt", "desc").get();
    return snapshot.docs.map((d) => toCreator(d.id, d.data() as Partial<CreatorDocument>));
  },

  async get(id) {
    const doc = await getDb().collection(COLLECTION).doc(id).get();
    return doc.exists ? toCreator(doc.id, doc.data() as Partial<CreatorDocument>) : null;
  },

  async create(doc) {
    const ref = await getDb()
      .collection(COLLECTION)
      .add({ ...doc, serverCreatedAt: FieldValue.serverTimestamp() });
    return toCreator(ref.id, doc);
  },

  async mutate(id, change) {
    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return null;
      const next = change(toCreator(id, snapshot.data() as Partial<CreatorDocument>));
      if (!next) return null;
      tx.set(ref, { ...next, updatedAt: Date.now() }, { merge: true });
      return toCreator(id, { ...next, updatedAt: Date.now() });
    });
  },

  async removeDoc(id) {
    await getDb().collection(COLLECTION).doc(id).delete();
  },

  async writeFile(path, buffer, contentType) {
    await getPrivateBucket().file(path).save(buffer, {
      resumable: false,
      contentType,
      metadata: { cacheControl: "private, no-store" },
    });
  },

  async readFile(path) {
    const file = getPrivateBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    return buffer;
  },

  async deleteFile(path) {
    await getPrivateBucket().file(path).delete({ ignoreNotFound: true });
  },

  async deleteFolder(prefix) {
    await getPrivateBucket().deleteFiles({ prefix, force: true });
  },

  async combine(chunks, destination, contentType) {
    const bucket = getPrivateBucket();
    const target = bucket.file(destination);
    // Storage composes at most 32 objects per call: step by step into the target.
    await bucket.combine(chunks.slice(0, 32).map((path) => bucket.file(path)), target);
    for (let start = 32; start < chunks.length; start += 31) {
      await bucket.combine(
        [target, ...chunks.slice(start, start + 31).map((path) => bucket.file(path))],
        target,
      );
    }
    await bucket.file(destination).setMetadata({ contentType, cacheControl: "private, no-store" });
    await Promise.all(chunks.map((path) => bucket.file(path).delete({ ignoreNotFound: true })));
    const [metadata] = await bucket.file(destination).getMetadata();
    return Number(metadata.size) || 0;
  },

  async copy(source, destination) {
    const bucket = getPrivateBucket();
    const [exists] = await bucket.file(source).exists();
    if (!exists) return false;
    await bucket.file(source).copy(bucket.file(destination));
    return true;
  },

  async signedUrl(path, contentType) {
    const [url] = await getPrivateBucket().file(path).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 6 * 60 * 60 * 1000,
      responseType: contentType,
    });
    return url;
  },
};

/* ── In-memory backend for local development ──────────────────────────── */
// Same switch as the applications (APPLICATIONS_DEV_STORE=memory), never in production.

interface MemoryState {
  docs: Map<string, CreatorDocument>;
  files: Map<string, Buffer>;
}

function memoryState(): MemoryState {
  const globalStore = globalThis as typeof globalThis & { __creatorsDevStore?: MemoryState };
  globalStore.__creatorsDevStore ??= { docs: new Map(), files: new Map() };
  return globalStore.__creatorsDevStore;
}

const memoryBackend: Backend = {
  available: () => true,

  async list() {
    return [...memoryState().docs.entries()]
      .map(([id, data]) => toCreator(id, data))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async get(id) {
    const data = memoryState().docs.get(id);
    return data ? toCreator(id, data) : null;
  },

  async create(doc) {
    const id = crypto.randomUUID();
    memoryState().docs.set(id, doc);
    return toCreator(id, doc);
  },

  async mutate(id, change) {
    const state = memoryState();
    const data = state.docs.get(id);
    if (!data) return null;
    const next = change(toCreator(id, data));
    if (!next) return null;
    const stored = { ...next, updatedAt: Date.now() };
    state.docs.set(id, stored);
    return toCreator(id, stored);
  },

  async removeDoc(id) {
    memoryState().docs.delete(id);
  },

  async writeFile(path, buffer) {
    memoryState().files.set(path, buffer);
  },

  async readFile(path) {
    return memoryState().files.get(path) ?? null;
  },

  async deleteFile(path) {
    memoryState().files.delete(path);
  },

  async deleteFolder(prefix) {
    const { files } = memoryState();
    for (const path of [...files.keys()]) if (path.startsWith(prefix)) files.delete(path);
  },

  async combine(chunks, destination) {
    const { files } = memoryState();
    const joined = Buffer.concat(chunks.map((path) => files.get(path) ?? Buffer.alloc(0)));
    files.set(destination, joined);
    for (const path of chunks) files.delete(path);
    return joined.length;
  },

  async copy(source, destination) {
    // The applications keep their own dev store.
    const buffer = await readApplicationObject(source);
    if (!buffer) return false;
    memoryState().files.set(destination, buffer);
    return true;
  },

  async signedUrl() {
    // No signed URLs locally: the media route streams the file itself.
    return null;
  },
};

function backend(): Backend {
  const useMemory =
    process.env.NODE_ENV !== "production" && process.env.APPLICATIONS_DEV_STORE === "memory";
  return useMemory ? memoryBackend : firebaseBackend;
}

/* ── Paths ─────────────────────────────────────────────────────────────── */

const folderOf = (creatorId: string) => `${FOLDER}/${creatorId}/`;
const photoPath = (creatorId: string, photoId: string, thumb = false) =>
  `${folderOf(creatorId)}photos/${photoId}${thumb ? "-thumb" : ""}.jpg`;
const videoFolder = (creatorId: string, videoId: string) =>
  `${folderOf(creatorId)}videos/${videoId}/`;
const chunkPath = (creatorId: string, videoId: string, index: number) =>
  `${videoFolder(creatorId, videoId)}chunks/${String(index).padStart(3, "0")}`;

const EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/* ── Profiles ──────────────────────────────────────────────────────────── */

export function isCreatorStoreAvailable(): boolean {
  return backend().available();
}

/** Order of the CMS and /creator: the sorted position, unsorted (new) ones first, newest first. */
export function sortCreators(creators: CreatorProfile[]): CreatorProfile[] {
  return [...creators].sort((a, b) => a.position - b.position || b.createdAt - a.createdAt);
}

export async function listCreators(): Promise<CreatorProfile[]> {
  if (!isCreatorStoreAvailable()) return [];
  return sortCreators(await backend().list());
}

/** Saves the order from the CMS; creators missing in `ids` keep their place after them. */
export async function reorderCreators(ids: string[]): Promise<void> {
  const store = backend();
  await Promise.all(
    ids.map((id, position) =>
      store.mutate(id, (current) => ({ ...withoutId(current), position })),
    ),
  );
}

export async function getCreator(id: string): Promise<CreatorProfile | null> {
  if (!isCreatorStoreAvailable()) return null;
  return backend().get(id);
}

export async function getCreatorBySlug(slug: string): Promise<CreatorProfile | null> {
  if (!isValidSlug(slug)) return null;
  return (await listCreators()).find((c) => c.slug === slug) ?? null;
}

export async function getCreatorForApplication(
  applicationId: string,
): Promise<CreatorProfile | null> {
  if (!applicationId) return null;
  return (await listCreators()).find((c) => c.applicationId === applicationId) ?? null;
}

/** Published profiles for /creator, newest first. */
export async function getPublishedCreators(): Promise<CreatorProfile[]> {
  return (await listCreators()).filter((c) => c.published && c.slug);
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const taken = new Set(
    (await listCreators()).filter((c) => c.id !== exceptId).map((c) => c.slug),
  );
  let candidate = base;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${base}-${n}`;
  return candidate;
}

export async function isSlugTaken(slug: string, exceptId: string): Promise<boolean> {
  return (await listCreators()).some((c) => c.id !== exceptId && c.slug === slug);
}

/**
 * Creates an unpublished profile from a creator pool application: name,
 * roles, city, gender, height, nationality, languages, channels and
 * portfolio link are taken over, photos and the setcard are copied (the
 * profile must not depend on the application files).
 */
export async function createCreatorFromApplication(
  application: Application,
): Promise<CreatorProfile> {
  const store = backend();
  const name = defaultCreatorName(application.firstName, application.lastName);
  const now = Date.now();
  const roles = CREATOR_ROLES.map((r) => r.id).filter((role) =>
    application.roles.includes(role),
  ) as CreatorRole[];

  const profile = await store.create({
    applicationId: application.id,
    consentConfirmedAt: 0,
    position: -1,
    slug: await uniqueSlug(`${slugBase(name)}-${slugSuffix()}`),
    published: false,
    name,
    roles: roles.length > 0 ? roles : ["model"],
    city: application.city,
    tagline: "",
    gender: application.gender,
    heightCm: application.heightCm,
    nationalities: application.nationalities,
    languages: application.languages,
    socials: application.socials,
    publicSocials: [],
    portfolioUrl: application.portfolioUrl,
    showPortfolio: false,
    setcardPath: "",
    setcardType: "",
    showSetcard: false,
    photos: [],
    videos: [],
    references: [],
    createdAt: now,
    updatedAt: now,
  });

  // Copy the files; a missing one is skipped rather than failing the profile.
  const photos: CreatorPhoto[] = [];
  for (let index = 0; index < application.photos.length; index += 1) {
    const file = await readApplicationFile(application, { kind: "photo", index });
    if (!file) continue;
    const id = newMediaId();
    const path = photoPath(profile.id, id);
    await store.writeFile(path, file.buffer, file.contentType);
    const size = imageSize(file.buffer);
    photos.push({
      id,
      path,
      // Application photos are already small (≤ 1400 px): one file for both.
      thumbPath: path,
      width: size?.width ?? 0,
      height: size?.height ?? 0,
      origin: "application",
      caption: "",
      hidden: false,
    });
  }

  let setcardPath = "";
  let setcardType = "";
  const setcard = await readApplicationFile(application, { kind: "setcard" });
  if (setcard) {
    setcardPath = `${folderOf(profile.id)}setcard.${EXTENSIONS[setcard.contentType] ?? "bin"}`;
    setcardType = setcard.contentType;
    await store.writeFile(setcardPath, setcard.buffer, setcard.contentType);
  }

  // Videos can be large: copied inside the bucket.
  const videos: CreatorVideo[] = [];
  for (const source of application.videos) {
    const id = newMediaId();
    const folder = videoFolder(profile.id, id);
    const path = `${folder}video.${EXTENSIONS[source.contentType] ?? "mp4"}`;
    if (!(await store.copy(source.path, path))) continue;
    const coverPath =
      source.coverPath && (await store.copy(source.coverPath, `${folder}cover.jpg`))
        ? `${folder}cover.jpg`
        : "";
    videos.push({
      ...emptyVideo(id, "upload", ""),
      status: "ready",
      path,
      coverPath,
      contentType: source.contentType,
      size: source.size,
    });
  }

  return (
    (await store.mutate(profile.id, (current) => ({
      ...withoutId(current),
      photos,
      videos,
      setcardPath,
      setcardType,
    }))) ?? profile
  );
}

/**
 * Creates an empty, unpublished profile without an application – for
 * creators Swibble already works with. The admin has confirmed their consent;
 * texts, photos and videos are added in the CMS.
 */
export async function createCreatorWithoutApplication(name: string): Promise<CreatorProfile> {
  const now = Date.now();
  return backend().create({
    applicationId: "",
    consentConfirmedAt: now,
    position: -1,
    slug: await uniqueSlug(`${slugBase(name)}-${slugSuffix()}`),
    published: false,
    name,
    roles: ["creator"],
    city: "",
    tagline: "",
    ...emptyProfileFacts(),
    socials: { tiktok: "", instagram: "", snapchat: "", youtube: "" },
    publicSocials: [],
    portfolioUrl: "",
    showPortfolio: false,
    setcardPath: "",
    setcardType: "",
    showSetcard: false,
    photos: [],
    videos: [],
    references: [],
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCreatorProfile(
  id: string,
  input: CreatorProfileInput,
): Promise<CreatorProfile | null> {
  return backend().mutate(id, (current) => ({
    ...withoutId(current),
    ...input,
    // A setcard can only be offered when one was taken over.
    showSetcard: input.showSetcard && Boolean(current.setcardPath),
  }));
}

/** Switches services (Model, Promoter …) on or off without touching the rest. */
export async function updateCreatorRoles(
  id: string,
  roles: CreatorRole[],
): Promise<CreatorProfile | null> {
  return backend().mutate(id, (current) => ({ ...withoutId(current), roles }));
}

/** Deletes a profile with all of its files. */
export async function deleteCreator(profile: CreatorProfile): Promise<void> {
  const store = backend();
  await store.deleteFolder(folderOf(profile.id));
  await store.removeDoc(profile.id);
}

/** Withdrawal: deleting an application also removes its creator page. */
export async function deleteCreatorForApplication(applicationId: string): Promise<boolean> {
  const profile = await getCreatorForApplication(applicationId);
  if (!profile) return false;
  await deleteCreator(profile);
  return true;
}

/* ── Photos ────────────────────────────────────────────────────────────── */

export async function addCreatorPhoto(
  profile: CreatorProfile,
  large: Buffer,
  thumb: Buffer,
): Promise<CreatorProfile | null> {
  const store = backend();
  const id = newMediaId();
  const size = imageSize(large);
  const path = photoPath(profile.id, id);
  const thumbPath = photoPath(profile.id, id, true);
  await store.writeFile(path, large, "image/jpeg");
  await store.writeFile(thumbPath, thumb, "image/jpeg");
  const photo: CreatorPhoto = {
    id,
    path,
    thumbPath,
    width: size?.width ?? 0,
    height: size?.height ?? 0,
    origin: "swibble",
    caption: "",
    hidden: false,
  };
  return store.mutate(profile.id, (current) => ({
    ...withoutId(current),
    photos: [...current.photos, photo],
  }));
}

/**
 * Photos placed in the bucket's `incoming/` folder by an admin (e.g. with
 * gsutil, for files that only exist on a computer): `<name>-large.jpg` and
 * `<name>-thumb.jpg`. Read once and removed after the import.
 */
export const INCOMING_FOLDER = "incoming/";

export async function readIncomingPhoto(
  name: string,
): Promise<{ large: Buffer; thumb: Buffer } | null> {
  const store = backend();
  const [large, thumb] = await Promise.all([
    store.readFile(`${INCOMING_FOLDER}${name}-large.jpg`),
    store.readFile(`${INCOMING_FOLDER}${name}-thumb.jpg`),
  ]);
  return large && thumb ? { large, thumb } : null;
}

export async function removeIncomingPhoto(name: string): Promise<void> {
  const store = backend();
  await Promise.all([
    store.deleteFile(`${INCOMING_FOLDER}${name}-large.jpg`),
    store.deleteFile(`${INCOMING_FOLDER}${name}-thumb.jpg`),
  ]);
}

/** A video in `incoming/`: `<name>.mp4` plus an optional `<name>-cover.jpg`. */
export async function readIncomingVideo(
  name: string,
): Promise<{ video: Buffer; cover: Buffer | null } | null> {
  const store = backend();
  const [video, cover] = await Promise.all([
    store.readFile(`${INCOMING_FOLDER}${name}.mp4`),
    store.readFile(`${INCOMING_FOLDER}${name}-cover.jpg`),
  ]);
  return video ? { video, cover } : null;
}

export async function removeIncomingVideo(name: string): Promise<void> {
  const store = backend();
  await Promise.all([
    store.deleteFile(`${INCOMING_FOLDER}${name}.mp4`),
    store.deleteFile(`${INCOMING_FOLDER}${name}-cover.jpg`),
  ]);
}

export async function removeCreatorPhoto(
  profile: CreatorProfile,
  photoId: string,
): Promise<CreatorProfile | null> {
  const store = backend();
  const photo = profile.photos.find((p) => p.id === photoId);
  if (!photo) return null;
  await store.deleteFile(photo.path);
  if (photo.thumbPath !== photo.path) await store.deleteFile(photo.thumbPath);
  return store.mutate(profile.id, (current) => ({
    ...withoutId(current),
    photos: current.photos.filter((p) => p.id !== photoId),
  }));
}

/** Puts the listed ids first, in that order; unknown ids are ignored. */
export function reorderById<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const wanted = [...new Set(ids)].filter((id) => byId.has(id));
  const rest = items.filter((item) => !wanted.includes(item.id));
  return [...wanted.map((id) => byId.get(id)!), ...rest];
}

export function reorderCreatorMedia(
  profile: CreatorProfile,
  kind: "photos" | "videos",
  ids: string[],
): Promise<CreatorProfile | null> {
  return backend().mutate(profile.id, (current) =>
    kind === "photos"
      ? { ...withoutId(current), photos: reorderById(current.photos, ids) }
      : { ...withoutId(current), videos: reorderById(current.videos, ids) },
  );
}

/* ── Videos ────────────────────────────────────────────────────────────── */

const emptyVideo = (id: string, source: CreatorVideo["source"], title: string): CreatorVideo => ({
  id,
  source,
  title,
  status: "processing",
  appJobId: "",
  videoUrl: "",
  coverUrl: "",
  path: "",
  coverPath: "",
  contentType: "",
  size: 0,
  width: 0,
  height: 0,
  hidden: false,
});

/** Maps the Swibble app's job state onto a creator video. */
export function applyAppJob(video: CreatorVideo, job: AppVideoJob): CreatorVideo {
  if (job.status === "ready") {
    if (!isTrustedMediaUrl(job.videoUrl) || !isTrustedMediaUrl(job.coverUrl)) {
      return { ...video, status: "failed" };
    }
    return {
      ...video,
      status: "ready",
      videoUrl: job.videoUrl,
      coverUrl: job.coverUrl,
      width: Number(job.width) || 0,
      height: Number(job.height) || 0,
      size: Number(job.size) || 0,
    };
  }
  return {
    ...video,
    status: job.status === "queued" || job.status === "processing" ? "processing" : "failed",
  };
}

export async function addCreatorAppVideo(
  profile: CreatorProfile,
  job: AppVideoJob,
  title: string,
): Promise<CreatorProfile | null> {
  return backend().mutate(profile.id, (current) => {
    // The same web copy twice makes no sense on one page.
    if (current.videos.some((v) => v.appJobId === job.jobId)) return withoutId(current);
    const video = applyAppJob({ ...emptyVideo(newMediaId(), "app", title), appJobId: job.jobId }, job);
    return { ...withoutId(current), videos: [...current.videos, video] };
  });
}

/** Stores new job states of app videos that are still being processed. */
export async function updateCreatorAppVideos(
  profile: CreatorProfile,
  jobs: Map<string, AppVideoJob>,
): Promise<CreatorProfile | null> {
  return backend().mutate(profile.id, (current) => ({
    ...withoutId(current),
    videos: current.videos.map((video) => {
      const job = video.source === "app" ? jobs.get(video.appJobId) : undefined;
      return job ? applyAppJob(video, job) : video;
    }),
  }));
}

/** Registers an upload; the file follows in VIDEO_CHUNK_BYTES pieces. */
export async function startCreatorVideoUpload(
  profile: CreatorProfile,
  meta: { size: number; contentType: string; title: string; width: number; height: number },
): Promise<{ profile: CreatorProfile; video: CreatorVideo } | null> {
  const id = newMediaId();
  const extension = EXTENSIONS[meta.contentType] ?? "mp4";
  const video: CreatorVideo = {
    ...emptyVideo(id, "upload", meta.title),
    status: "uploading",
    path: `${videoFolder(profile.id, id)}video.${extension}`,
    contentType: meta.contentType,
    size: meta.size,
    width: meta.width,
    height: meta.height,
  };
  const updated = await backend().mutate(profile.id, (current) => ({
    ...withoutId(current),
    videos: [...current.videos, video],
  }));
  return updated ? { profile: updated, video } : null;
}

export function saveCreatorVideoChunk(
  profile: CreatorProfile,
  video: CreatorVideo,
  index: number,
  buffer: Buffer,
): Promise<void> {
  return backend().writeFile(chunkPath(profile.id, video.id, index), buffer, "application/octet-stream");
}

export async function saveCreatorVideoCover(
  profile: CreatorProfile,
  video: CreatorVideo,
  buffer: Buffer,
): Promise<CreatorProfile | null> {
  const coverPath = `${videoFolder(profile.id, video.id)}cover.jpg`;
  await backend().writeFile(coverPath, buffer, "image/jpeg");
  return backend().mutate(profile.id, (current) => ({
    ...withoutId(current),
    videos: current.videos.map((v) => (v.id === video.id ? { ...v, coverPath } : v)),
  }));
}

/** Stores a complete video file (e.g. copied from the home page) as a ready upload. */
export async function addCreatorVideoFile(
  profile: CreatorProfile,
  file: {
    buffer: Buffer;
    contentType: string;
    cover: Buffer | null;
    title: string;
    width: number;
    height: number;
  },
): Promise<CreatorProfile | null> {
  const store = backend();
  const id = newMediaId();
  const folder = videoFolder(profile.id, id);
  const path = `${folder}video.${EXTENSIONS[file.contentType] ?? "mp4"}`;
  await store.writeFile(path, file.buffer, file.contentType);
  const coverPath = file.cover ? `${folder}cover.jpg` : "";
  if (file.cover) await store.writeFile(coverPath, file.cover, "image/jpeg");
  const video: CreatorVideo = {
    ...emptyVideo(id, "upload", file.title),
    status: "ready",
    path,
    coverPath,
    contentType: file.contentType,
    size: file.buffer.length,
    width: file.width,
    height: file.height,
  };
  return store.mutate(profile.id, (current) => ({
    ...withoutId(current),
    videos: [...current.videos, video],
  }));
}

/** Joins the uploaded pieces; the video goes live once the size matches. */
export async function completeCreatorVideoUpload(
  profile: CreatorProfile,
  video: CreatorVideo,
): Promise<{ ok: true; profile: CreatorProfile } | { ok: false; message: string }> {
  const store = backend();
  const chunks = Array.from({ length: videoChunkCount(video.size) }, (_, index) =>
    chunkPath(profile.id, video.id, index),
  );
  const size = await store.combine(chunks, video.path, video.contentType);
  if (size !== video.size) {
    return { ok: false, message: "Das Video ist nicht vollständig angekommen. Bitte noch einmal hochladen." };
  }
  const updated = await store.mutate(profile.id, (current) => ({
    ...withoutId(current),
    videos: current.videos.map((v) => (v.id === video.id ? { ...v, status: "ready" } : v)),
  }));
  return updated ? { ok: true, profile: updated } : { ok: false, message: "Nicht gefunden." };
}

/** Shows or hides one photo / video on the page without deleting it. */
export async function setCreatorMediaHidden(
  profile: CreatorProfile,
  kind: "photo" | "video",
  id: string,
  hidden: boolean,
): Promise<CreatorProfile | null> {
  return backend().mutate(profile.id, (current) =>
    kind === "photo"
      ? { ...withoutId(current), photos: current.photos.map((p) => (p.id === id ? { ...p, hidden } : p)) }
      : { ...withoutId(current), videos: current.videos.map((v) => (v.id === id ? { ...v, hidden } : v)) },
  );
}

export async function updateCreatorPhotoCaption(
  profile: CreatorProfile,
  photoId: string,
  caption: string,
): Promise<CreatorProfile | null> {
  return backend().mutate(profile.id, (current) => ({
    ...withoutId(current),
    photos: current.photos.map((p) => (p.id === photoId ? { ...p, caption } : p)),
  }));
}

export async function updateCreatorVideoTitle(
  profile: CreatorProfile,
  videoId: string,
  title: string,
): Promise<CreatorProfile | null> {
  return backend().mutate(profile.id, (current) => ({
    ...withoutId(current),
    videos: current.videos.map((v) => (v.id === videoId ? { ...v, title } : v)),
  }));
}

/**
 * Removes a video from the page. Web copies of app videos stay in the app
 * (the home page carousel may use the same copy).
 */
export async function removeCreatorVideo(
  profile: CreatorProfile,
  videoId: string,
): Promise<CreatorProfile | null> {
  const video = profile.videos.find((v) => v.id === videoId);
  if (!video) return null;
  if (video.source === "upload") await backend().deleteFolder(videoFolder(profile.id, video.id));
  return backend().mutate(profile.id, (current) => ({
    ...withoutId(current),
    videos: current.videos.filter((v) => v.id !== videoId),
  }));
}

/* ── Media access for /api/creator-media ───────────────────────────────── */

export type CreatorMediaSource =
  | { kind: "buffer"; buffer: Buffer; contentType: string }
  | { kind: "redirect"; url: string };

export async function readCreatorMedia(
  profile: CreatorProfile,
  file:
    | { kind: "photo" | "thumb" | "video" | "cover"; id: string }
    | { kind: "setcard" },
): Promise<CreatorMediaSource | null> {
  const store = backend();
  const read = async (path: string, contentType: string): Promise<CreatorMediaSource | null> => {
    const buffer = path ? await store.readFile(path) : null;
    return buffer ? { kind: "buffer", buffer, contentType } : null;
  };

  if (file.kind === "setcard") {
    return profile.showSetcard ? read(profile.setcardPath, profile.setcardType) : null;
  }
  if (file.kind === "photo" || file.kind === "thumb") {
    const photo = profile.photos.find((p) => p.id === file.id);
    if (!photo) return null;
    return read(file.kind === "photo" ? photo.path : photo.thumbPath, "image/jpeg");
  }

  const video = profile.videos.find((v) => v.id === file.id && v.source === "upload");
  if (!video) return null;
  if (file.kind === "cover") return read(video.coverPath, "image/jpeg");
  if (video.status !== "ready") return null;
  // Videos are too large for a function response: hand out a signed link.
  const url = await store.signedUrl(video.path, video.contentType);
  return url ? { kind: "redirect", url } : read(video.path, video.contentType);
}
