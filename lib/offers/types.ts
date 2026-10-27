/** One creator in an offer, with Swibble's price for this customer. */
export interface OfferItem {
  creatorId: string;
  /** Free text, e.g. "450 € netto / Drehtag" */
  price: string;
  /** Optional detail, e.g. "inkl. 2 Reels und Nutzungsrechten" */
  note: string;
}

/** A choice sent from the offer page. Contact details only go out by mail. */
export interface OfferRequest {
  at: number;
  creatorIds: string[];
}

/**
 * A web offer (/angebot/<token>): a few creators with prices for one
 * customer, who picks one or more and sends an inquiry.
 */
export interface CreatorOffer {
  /** Firestore document id */
  id: string;
  /** Secret part of the link; changes when the link is renewed */
  token: string;
  /** Customer, shown on the page ("für Aquis Plaza") */
  customer: string;
  /** Headline, e.g. "Creator für die Oster-Kampagne" */
  title: string;
  /** Short intro text above the creators */
  message: string;
  items: OfferItem[];
  /** Link switched off = the page is gone */
  active: boolean;
  views: number;
  lastViewedAt: number;
  requests: OfferRequest[];
  createdAt: number;
  updatedAt: number;
}

/** Fields edited in the CMS. */
export interface OfferInput {
  customer: string;
  title: string;
  message: string;
  items: OfferItem[];
  active: boolean;
}
