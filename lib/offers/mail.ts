// Mails for a choice from a web offer (to Swibble, confirmation to the
// customer). Pure functions — the layout HTML-escapes every value.

import { EMAIL } from "@/lib/cta";
import { buildMail, type BuiltMail, type CreatorInquiry } from "@/lib/creators/inquiry";
import { PRICE_ON_REQUEST } from "./config";

/** A picked creator as it appears in the mails. */
export interface ChosenCreator {
  name: string;
  price: string;
}

const contactRows = (inquiry: CreatorInquiry) =>
  [
    { label: "Unternehmen", value: inquiry.company },
    { label: "Name", value: inquiry.name },
    { label: "E-Mail", value: inquiry.email },
    { label: "Telefon", value: inquiry.phone },
  ].filter((row) => row.value);

const creatorRows = (chosen: ChosenCreator[]) =>
  chosen.map((creator) => ({ label: creator.name, value: creator.price || PRICE_ON_REQUEST }));

/** To Swibble: the choice with full names and prices, reply goes to the customer. */
export function buildOfferNotification(
  inquiry: CreatorInquiry,
  offer: { customer: string; headline: string; chosen: ChosenCreator[]; adminUrl: string },
  logoSrc?: string,
): BuiltMail {
  const names = offer.chosen.map((creator) => creator.name).join(", ");
  return buildMail(
    {
      title: `Angebot angefragt: ${names} – ${inquiry.company}`,
      heading: `Auswahl aus dem Angebot für ${offer.customer}`,
      intro: `${inquiry.name} hat über das Web-Angebot „${offer.headline}“ ${
        offer.chosen.length === 1 ? "einen Creator" : `${offer.chosen.length} Creator`
      } angefragt. Antworten geht direkt an ${inquiry.name}.`,
      rowsLabel: "Ausgewählt",
      rows: [...creatorRows(offer.chosen), ...contactRows(inquiry)],
      messageLabel: "Nachricht",
      message: inquiry.message,
      ctaIntro: "Angebot im Admin-Bereich:",
      cta: { href: offer.adminUrl, label: "Im Admin öffnen" },
      closing: [],
      footerNote: "Automatische Benachrichtigung der Swibble-Website bei Anfragen zu Web-Angeboten.",
    },
    logoSrc,
  );
}

/** To the customer (Du-Form like the other forms): first names only. */
export function buildOfferConfirmation(
  inquiry: CreatorInquiry,
  offer: { chosen: ChosenCreator[]; offerUrl: string },
  logoSrc?: string,
): BuiltMail {
  const firstName = inquiry.name.split(" ")[0] ?? "";
  return buildMail(
    {
      title: "Deine Creator-Auswahl ist angekommen",
      heading: firstName ? `Danke, ${firstName}!` : "Danke für deine Anfrage!",
      intro: "Deine Auswahl ist bei uns angekommen. Wir melden uns schnellstmöglich bei dir.",
      rowsLabel: "Deine Auswahl",
      rows: [...creatorRows(offer.chosen), ...contactRows(inquiry)],
      messageLabel: "Deine Nachricht",
      message: inquiry.message,
      ctaIntro: "Das Angebot findest du weiterhin hier:",
      cta: { href: offer.offerUrl, label: "Zum Angebot" },
      closing: ["Viele Grüße", "Dein Swibble-Team"],
      footerNote: `Du erhältst diese E-Mail, weil über ein Swibble-Angebot eine Anfrage mit deiner E-Mail-Adresse gesendet wurde. Das warst nicht du? Dann ignoriere diese E-Mail einfach oder schreib an ${EMAIL}.`,
    },
    logoSrc,
  );
}
