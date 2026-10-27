import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebaseAdmin";
import { isValidId } from "@/lib/creators/config";
import { OFFER_REQUESTS_MAX, isOfferToken } from "./config";
import type { CreatorOffer, OfferInput, OfferRequest } from "./types";

const COLLECTION = "creatorOffers";

type OfferDocument = Omit<CreatorOffer, "id">;

/** Fills defaults so older or partial documents never break the pages. */
export function toOffer(id: string, data: Partial<OfferDocument>): CreatorOffer {
  return {
    id,
    token: isOfferToken(data.token) ? data.token : "",
    customer: data.customer ?? "",
    title: data.title ?? "",
    message: data.message ?? "",
    items: (data.items ?? [])
      .filter((item) => isValidId(item?.creatorId))
      .map((item) => ({ creatorId: item.creatorId, price: item.price ?? "", note: item.note ?? "" })),
    active: data.active === true,
    views: data.views ?? 0,
    lastViewedAt: data.lastViewedAt ?? 0,
    requests: (data.requests ?? []).map((request) => ({
      at: request.at ?? 0,
      creatorIds: (request.creatorIds ?? []).filter(isValidId),
    })),
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? data.createdAt ?? 0,
  };
}

const newToken = () => crypto.randomBytes(18).toString("base64url");

interface Backend {
  list(): Promise<CreatorOffer[]>;
  get(id: string): Promise<CreatorOffer | null>;
  getByToken(token: string): Promise<CreatorOffer | null>;
  create(doc: OfferDocument): Promise<CreatorOffer>;
  /** Read-modify-write of one offer (a transaction in Firestore). */
  mutate(id: string, change: (offer: CreatorOffer) => OfferDocument): Promise<CreatorOffer | null>;
  countView(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}

const withoutId = ({ id: _id, ...doc }: CreatorOffer): OfferDocument => doc;

/* ── Firestore ─────────────────────────────────────────────────────────── */

const firebaseBackend: Backend = {
  async list() {
    const snapshot = await getDb().collection(COLLECTION).orderBy("createdAt", "desc").get();
    return snapshot.docs.map((d) => toOffer(d.id, d.data() as Partial<OfferDocument>));
  },

  async get(id) {
    const doc = await getDb().collection(COLLECTION).doc(id).get();
    return doc.exists ? toOffer(doc.id, doc.data() as Partial<OfferDocument>) : null;
  },

  async getByToken(token) {
    const snapshot = await getDb().collection(COLLECTION).where("token", "==", token).limit(1).get();
    const doc = snapshot.docs[0];
    return doc ? toOffer(doc.id, doc.data() as Partial<OfferDocument>) : null;
  },

  async create(doc) {
    const ref = await getDb()
      .collection(COLLECTION)
      .add({ ...doc, serverCreatedAt: FieldValue.serverTimestamp() });
    return toOffer(ref.id, doc);
  },

  async mutate(id, change) {
    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return null;
      const next = { ...change(toOffer(id, snapshot.data() as Partial<OfferDocument>)), updatedAt: Date.now() };
      tx.set(ref, next, { merge: true });
      return toOffer(id, next);
    });
  },

  async countView(id) {
    await getDb()
      .collection(COLLECTION)
      .doc(id)
      .update({ views: FieldValue.increment(1), lastViewedAt: Date.now() });
  },

  async remove(id) {
    await getDb().collection(COLLECTION).doc(id).delete();
  },
};

/* ── In memory (local development: APPLICATIONS_DEV_STORE=memory) ─────── */

function memoryDocs(): Map<string, OfferDocument> {
  const globalStore = globalThis as typeof globalThis & { __offersDevStore?: Map<string, OfferDocument> };
  globalStore.__offersDevStore ??= new Map();
  return globalStore.__offersDevStore;
}

const memoryBackend: Backend = {
  async list() {
    return [...memoryDocs().entries()]
      .map(([id, data]) => toOffer(id, data))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async get(id) {
    const data = memoryDocs().get(id);
    return data ? toOffer(id, data) : null;
  },

  async getByToken(token) {
    const found = [...memoryDocs().entries()].find(([, data]) => data.token === token);
    return found ? toOffer(found[0], found[1]) : null;
  },

  async create(doc) {
    const id = crypto.randomUUID();
    memoryDocs().set(id, doc);
    return toOffer(id, doc);
  },

  async mutate(id, change) {
    const data = memoryDocs().get(id);
    if (!data) return null;
    const next = { ...change(toOffer(id, data)), updatedAt: Date.now() };
    memoryDocs().set(id, next);
    return toOffer(id, next);
  },

  async countView(id) {
    const data = memoryDocs().get(id);
    if (data) memoryDocs().set(id, { ...data, views: data.views + 1, lastViewedAt: Date.now() });
  },

  async remove(id) {
    memoryDocs().delete(id);
  },
};

function backend(): Backend {
  const useMemory =
    process.env.NODE_ENV !== "production" && process.env.APPLICATIONS_DEV_STORE === "memory";
  return useMemory ? memoryBackend : firebaseBackend;
}

/* ── Offers ────────────────────────────────────────────────────────────── */

export function isOfferStoreAvailable(): boolean {
  const useMemory =
    process.env.NODE_ENV !== "production" && process.env.APPLICATIONS_DEV_STORE === "memory";
  return useMemory || isFirebaseConfigured();
}

export const listOffers = () => backend().list();

export const getOffer = (id: string) => backend().get(id);

/** Only well-formed tokens reach the database. */
export const getOfferByToken = async (token: unknown) =>
  isOfferToken(token) ? backend().getByToken(token) : null;

/** A new offer with its own secret link, live right away (creators follow in the editor). */
export async function createOffer(customer: string, title: string): Promise<CreatorOffer> {
  const now = Date.now();
  return backend().create({
    token: newToken(),
    customer,
    title,
    message: "",
    items: [],
    active: true,
    views: 0,
    lastViewedAt: 0,
    requests: [],
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateOffer(id: string, input: OfferInput): Promise<CreatorOffer | null> {
  return backend().mutate(id, (current) => ({ ...withoutId(current), ...input }));
}

export const deleteOffer = (id: string) => backend().remove(id);

export const countOfferView = (id: string) => backend().countView(id);

/** Remembers which creators a customer asked for (contact details go by mail only). */
export async function addOfferRequest(id: string, creatorIds: string[]): Promise<void> {
  await backend().mutate(id, (current) => {
    const request: OfferRequest = { at: Date.now(), creatorIds };
    return { ...withoutId(current), requests: [...current.requests, request].slice(-OFFER_REQUESTS_MAX) };
  });
}

/** True when the live offer behind `token` shows this creator (media of drafts load then). */
export async function offerShowsCreator(token: unknown, creatorId: string): Promise<boolean> {
  const offer = await getOfferByToken(token);
  return Boolean(offer?.active && offer.items.some((item) => item.creatorId === creatorId));
}
