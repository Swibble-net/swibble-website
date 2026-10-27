// Web offers (/angebot/<token>): limits and pure helpers, shared by the CMS,
// the API routes and the offer page.

import { isValidId } from "@/lib/creators/config";
import type { CreatorOffer, OfferInput, OfferItem } from "./types";

export const CUSTOMER_MAX_LENGTH = 80;
export const TITLE_MAX_LENGTH = 100;
export const MESSAGE_MAX_LENGTH = 1000;
export const PRICE_MAX_LENGTH = 60;
export const NOTE_MAX_LENGTH = 160;
export const OFFER_ITEMS_MAX = 12;
/** Choices kept on the offer for the CMS (oldest drop out). */
export const OFFER_REQUESTS_MAX = 50;

/** Shown when no price is entered. */
export const PRICE_ON_REQUEST = "Preis auf Anfrage";

/** Offer prices are always net; said on the page and in the customer's confirmation. */
export const NET_PRICES_NOTE = "Alle Preise netto zzgl. gesetzlicher MwSt.";

/** Query parameter that lets creator media load on an offer page. */
export const OFFER_PARAM = "angebot";

const TOKEN = /^[A-Za-z0-9_-]{24}$/;

export const isOfferToken = (value: unknown): value is string =>
  typeof value === "string" && TOKEN.test(value);

export const offerPath = (token: string) => `/angebot/${encodeURIComponent(token)}`;

/** Headline of the page: the own title, or a default with the customer. */
export const offerHeadline = (offer: Pick<CreatorOffer, "title" | "customer">) =>
  offer.title || `Creator-Vorschläge für ${offer.customer}`;

// Control characters and angle brackets never belong in a short text.
const FORBIDDEN_TEXT = /[\u0000-\u001f\u007f<>]/;

function line(value: unknown, max: number): string | null {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return text.length > max || FORBIDDEN_TEXT.test(text) ? null : text;
}

/** Several lines (line breaks kept, at most one empty line in a row). */
function paragraph(value: unknown, max: number): string | null {
  const text =
    typeof value === "string"
      ? value
          .replace(/\r\n?/g, "\n")
          .split("\n")
          .map((row) => row.trim().replace(/\s+/g, " "))
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
      : "";
  return text.length > max || FORBIDDEN_TEXT.test(text.replace(/\n/g, " ")) ? null : text;
}

export function validateOfferInput(
  input: unknown,
): { ok: true; value: OfferInput } | { ok: false; message: string } {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fail = (message: string) => ({ ok: false as const, message });

  const customer = line(raw.customer, CUSTOMER_MAX_LENGTH);
  if (!customer) return fail(`Bitte gib den Kunden an (max. ${CUSTOMER_MAX_LENGTH} Zeichen).`);
  const title = line(raw.title, TITLE_MAX_LENGTH);
  if (title === null) return fail(`Die Überschrift darf höchstens ${TITLE_MAX_LENGTH} Zeichen haben.`);
  const message = paragraph(raw.message, MESSAGE_MAX_LENGTH);
  if (message === null) return fail(`Der Text darf höchstens ${MESSAGE_MAX_LENGTH} Zeichen haben.`);

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  if (rawItems.length > OFFER_ITEMS_MAX) return fail(`Höchstens ${OFFER_ITEMS_MAX} Creator pro Angebot.`);
  const items: OfferItem[] = [];
  for (const entry of rawItems) {
    const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    if (!isValidId(item.creatorId)) return fail("Bitte prüfe die Creator-Auswahl.");
    if (items.some((known) => known.creatorId === item.creatorId)) continue;
    const price = line(item.price, PRICE_MAX_LENGTH);
    if (price === null) return fail(`Ein Preis darf höchstens ${PRICE_MAX_LENGTH} Zeichen haben.`);
    const note = line(item.note, NOTE_MAX_LENGTH);
    if (note === null) return fail(`Eine Notiz darf höchstens ${NOTE_MAX_LENGTH} Zeichen haben.`);
    items.push({ creatorId: item.creatorId, price, note });
  }

  return { ok: true, value: { customer, title, message, items, active: raw.active === true } };
}

/**
 * The creators a customer picked, in the order of the offer; null when the
 * choice is empty or names a creator who isn't part of the offer.
 */
export function chosenItems(offer: Pick<CreatorOffer, "items">, value: unknown): OfferItem[] | null {
  const ids = Array.isArray(value) ? [...new Set(value)] : [];
  if (ids.length === 0 || ids.length > offer.items.length) return null;
  const chosen = offer.items.filter((item) => ids.includes(item.creatorId));
  return chosen.length === ids.length ? chosen : null;
}
