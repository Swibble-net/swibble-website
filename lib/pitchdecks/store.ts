import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  getDb,
  getPrivateBucket,
  isFirebaseConfigured,
  isStorageConfigured,
} from "@/lib/firebaseAdmin";
import { buildSlug, contentDisposition, downloadFileName, pdfChunkCount } from "./config";
import type { PitchDeck, PitchDeckInput } from "./types";

const COLLECTION = "pitchdecks";
const FOLDER_PREFIX = "pitchdecks";

type PitchDeckDocument = Omit<PitchDeck, "id">;

export type PdfSource =
  | { kind: "redirect"; url: string }
  | { kind: "buffer"; buffer: Buffer };

interface Backend {
  available(): boolean;
  create(doc: PitchDeckDocument): Promise<PitchDeck>;
  list(): Promise<PitchDeck[]>;
  get(id: string): Promise<PitchDeck | null>;
  getBySlug(slug: string): Promise<PitchDeck | null>;
  markReady(id: string): Promise<void>;
  countView(id: string): Promise<void>;
  remove(deck: PitchDeck): Promise<void>;
  writeFile(path: string, buffer: Buffer, contentType: string): Promise<void>;
  readFile(path: string): Promise<Buffer | null>;
  fileSize(path: string): Promise<number | null>;
  /** Joins the uploaded chunks into one object and removes the chunks. */
  combine(chunks: string[], destination: string): Promise<void>;
  pdfSource(deck: PitchDeck, disposition: string): Promise<PdfSource | null>;
}

/** Fills defaults so older or partial documents never break the pages. */
export function toPitchDeck(id: string, data: Partial<PitchDeckDocument>): PitchDeck {
  return {
    id,
    slug: data.slug ?? "",
    customer: data.customer ?? "",
    title: data.title ?? "",
    status: data.status === "ready" ? "ready" : "uploading",
    folder: data.folder ?? "",
    pages: data.pages ?? [],
    pdfSize: data.pdfSize ?? 0,
    originalSize: data.originalSize ?? data.pdfSize ?? 0,
    compressed: data.compressed ?? false,
    views: data.views ?? 0,
    lastViewedAt: data.lastViewedAt ?? 0,
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

export const pagePath = (deck: Pick<PitchDeck, "folder">, index: number) =>
  `${deck.folder}/pages/${String(index + 1).padStart(3, "0")}.jpg`;
export const pdfPath = (deck: Pick<PitchDeck, "folder">) => `${deck.folder}/deck.pdf`;
export const chunkPath = (deck: Pick<PitchDeck, "folder">, index: number) =>
  `${deck.folder}/chunks/${String(index).padStart(3, "0")}`;

/* ── Firestore + Firebase Storage ─────────────────────────────────────── */

const firebaseBackend: Backend = {
  available: () => isStorageConfigured(),

  async create(doc) {
    const ref = await getDb().collection(COLLECTION).add(doc);
    return toPitchDeck(ref.id, doc);
  },

  async list() {
    const snapshot = await getDb().collection(COLLECTION).orderBy("createdAt", "desc").get();
    return snapshot.docs.map((d) => toPitchDeck(d.id, d.data() as Partial<PitchDeckDocument>));
  },

  async get(id) {
    const doc = await getDb().collection(COLLECTION).doc(id).get();
    return doc.exists ? toPitchDeck(doc.id, doc.data() as Partial<PitchDeckDocument>) : null;
  },

  async getBySlug(slug) {
    const snapshot = await getDb().collection(COLLECTION).where("slug", "==", slug).limit(1).get();
    const doc = snapshot.docs[0];
    return doc ? toPitchDeck(doc.id, doc.data() as Partial<PitchDeckDocument>) : null;
  },

  async markReady(id) {
    await getDb().collection(COLLECTION).doc(id).update({ status: "ready", updatedAt: Date.now() });
  },

  async countView(id) {
    await getDb()
      .collection(COLLECTION)
      .doc(id)
      .update({ views: FieldValue.increment(1), lastViewedAt: Date.now() });
  },

  async remove(deck) {
    // Files first: if this fails, the document still points to the folder.
    if (deck.folder) {
      await getPrivateBucket().deleteFiles({ prefix: `${deck.folder}/`, force: true });
    }
    await getDb().collection(COLLECTION).doc(deck.id).delete();
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

  async fileSize(path) {
    const file = getPrivateBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [metadata] = await file.getMetadata();
    return Number(metadata.size);
  },

  async combine(chunks, destination) {
    const bucket = getPrivateBucket();
    await bucket.combine(
      chunks.map((path) => bucket.file(path)),
      bucket.file(destination),
    );
    await bucket.file(destination).setMetadata({
      contentType: "application/pdf",
      cacheControl: "private, no-store",
    });
    await Promise.all(chunks.map((path) => bucket.file(path).delete({ ignoreNotFound: true })));
  },

  async pdfSource(deck, disposition) {
    // Large PDFs don't fit through a Vercel function (4.5 MB response limit),
    // so the download goes straight to storage with a short-lived signed URL.
    const [url] = await getPrivateBucket()
      .file(pdfPath(deck))
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
        responseDisposition: disposition,
        responseType: "application/pdf",
      });
    return { kind: "redirect", url };
  },
};

/* ── In-memory backend for local development ──────────────────────────── */
// Opt-in via PITCHDECKS_DEV_STORE=memory and never active in production.

interface MemoryState {
  docs: Map<string, PitchDeckDocument>;
  files: Map<string, Buffer>;
}

function memoryState(): MemoryState {
  const globalStore = globalThis as typeof globalThis & { __pitchdecksDevStore?: MemoryState };
  globalStore.__pitchdecksDevStore ??= { docs: new Map(), files: new Map() };
  return globalStore.__pitchdecksDevStore;
}

const memoryBackend: Backend = {
  available: () => true,

  async create(doc) {
    const id = crypto.randomUUID();
    memoryState().docs.set(id, doc);
    return toPitchDeck(id, doc);
  },

  async list() {
    return [...memoryState().docs.entries()]
      .map(([id, data]) => toPitchDeck(id, data))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async get(id) {
    const data = memoryState().docs.get(id);
    return data ? toPitchDeck(id, data) : null;
  },

  async getBySlug(slug) {
    const entry = [...memoryState().docs.entries()].find(([, d]) => d.slug === slug);
    return entry ? toPitchDeck(entry[0], entry[1]) : null;
  },

  async markReady(id) {
    const data = memoryState().docs.get(id);
    if (data) memoryState().docs.set(id, { ...data, status: "ready", updatedAt: Date.now() });
  },

  async countView(id) {
    const data = memoryState().docs.get(id);
    if (data) {
      memoryState().docs.set(id, { ...data, views: data.views + 1, lastViewedAt: Date.now() });
    }
  },

  async remove(deck) {
    const state = memoryState();
    for (const path of [...state.files.keys()]) {
      if (path.startsWith(`${deck.folder}/`)) state.files.delete(path);
    }
    state.docs.delete(deck.id);
  },

  async writeFile(path, buffer) {
    memoryState().files.set(path, buffer);
  },

  async readFile(path) {
    return memoryState().files.get(path) ?? null;
  },

  async fileSize(path) {
    return memoryState().files.get(path)?.length ?? null;
  },

  async combine(chunks, destination) {
    const state = memoryState();
    state.files.set(destination, Buffer.concat(chunks.map((path) => state.files.get(path)!)));
    for (const path of chunks) state.files.delete(path);
  },

  async pdfSource(deck) {
    const buffer = memoryState().files.get(pdfPath(deck));
    return buffer ? { kind: "buffer", buffer } : null;
  },
};

function backend(): Backend {
  const useMemory =
    process.env.NODE_ENV !== "production" && process.env.PITCHDECKS_DEV_STORE === "memory";
  return useMemory ? memoryBackend : firebaseBackend;
}

/* ── Public API ───────────────────────────────────────────────────────── */

/** True when decks can be stored: Firestore plus the private bucket. */
export function isPitchDeckStoreAvailable(): boolean {
  return backend().available();
}

/** Reason for the admin page when the store is unavailable. */
export function storeProblem(): string | null {
  if (isPitchDeckStoreAvailable()) return null;
  return isFirebaseConfigured()
    ? "FIREBASE_STORAGE_BUCKET fehlt in dieser Umgebung (nur in Production gesetzt)."
    : "Firebase ist in dieser Umgebung nicht konfiguriert.";
}

export function createPitchDeck(input: PitchDeckInput): Promise<PitchDeck> {
  const now = Date.now();
  return backend().create({
    ...input,
    slug: buildSlug(input.customer),
    status: "uploading",
    // Random folder: nothing about the customer leaks into object paths.
    folder: `${FOLDER_PREFIX}/${crypto.randomUUID()}`,
    views: 0,
    lastViewedAt: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function listPitchDecks(): Promise<PitchDeck[]> {
  if (!isPitchDeckStoreAvailable()) return [];
  return backend().list();
}

export async function getPitchDeck(id: string): Promise<PitchDeck | null> {
  if (!isPitchDeckStoreAvailable()) return null;
  return backend().get(id);
}

/** Only finished decks are reachable through their public link. */
export async function getReadyPitchDeckBySlug(slug: string): Promise<PitchDeck | null> {
  if (!isPitchDeckStoreAvailable()) return null;
  const deck = await backend().getBySlug(slug);
  return deck?.status === "ready" ? deck : null;
}

export function savePage(deck: PitchDeck, index: number, buffer: Buffer): Promise<void> {
  return backend().writeFile(pagePath(deck, index), buffer, "image/jpeg");
}

export function savePdfChunk(deck: PitchDeck, index: number, buffer: Buffer): Promise<void> {
  return backend().writeFile(chunkPath(deck, index), buffer, "application/octet-stream");
}

export type CompleteResult = { ok: true } | { ok: false; message: string };

/**
 * Checks that every slide and every PDF chunk arrived, joins the chunks and
 * makes the deck reachable. Safe to call again after a failed attempt.
 */
export async function completePitchDeck(deck: PitchDeck): Promise<CompleteResult> {
  const store = backend();

  for (let i = 0; i < deck.pages.length; i += 1) {
    if ((await store.fileSize(pagePath(deck, i))) === null) {
      return { ok: false, message: `Folie ${i + 1} fehlt. Bitte lade die Präsentation neu hoch.` };
    }
  }

  // A previous attempt may already have joined the chunks (and removed them).
  if ((await store.fileSize(pdfPath(deck))) !== deck.pdfSize) {
    const chunks = Array.from({ length: pdfChunkCount(deck.pdfSize) }, (_, i) => chunkPath(deck, i));
    let total = 0;
    for (const chunk of chunks) total += (await store.fileSize(chunk)) ?? Number.NaN;
    if (total !== deck.pdfSize) {
      return { ok: false, message: "Das PDF ist unvollständig angekommen." };
    }
    await store.combine(chunks, pdfPath(deck));
    if ((await store.fileSize(pdfPath(deck))) !== deck.pdfSize) {
      return { ok: false, message: "Das PDF konnte nicht gespeichert werden." };
    }
  }

  await store.markReady(deck.id);
  return { ok: true };
}

export function deletePitchDeck(deck: PitchDeck): Promise<void> {
  return backend().remove(deck);
}

export function countPitchDeckView(deck: PitchDeck): Promise<void> {
  return backend().countView(deck.id);
}

export function readPage(deck: PitchDeck, index: number): Promise<Buffer | null> {
  return backend().readFile(pagePath(deck, index));
}

export function pdfSource(deck: PitchDeck, type: "inline" | "attachment"): Promise<PdfSource | null> {
  return backend().pdfSource(deck, contentDisposition(type, downloadFileName(deck)));
}
