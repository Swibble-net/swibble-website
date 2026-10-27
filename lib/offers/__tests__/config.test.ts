import { describe, expect, it } from "vitest";
import { chosenItems, isOfferToken, offerHeadline, offerPath, validateOfferInput } from "../config";
import { toOffer } from "../store";

const valid = {
  customer: "  Aquis   Plaza ",
  title: "",
  message: "Hallo Frau Muster,\r\n\r\n\r\nhier unsere Vorschläge.  ",
  items: [
    { creatorId: "cr1", price: " 450 € netto / Drehtag ", note: "inkl. 2 Reels" },
    { creatorId: "cr2", price: "", note: "" },
    { creatorId: "cr1", price: "doppelt", note: "" },
  ],
  active: true,
};

describe("validateOfferInput", () => {
  it("tidies the texts and keeps each creator once", () => {
    const result = validateOfferInput(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.customer).toBe("Aquis Plaza");
    expect(result.value.message).toBe("Hallo Frau Muster,\n\nhier unsere Vorschläge.");
    expect(result.value.items).toEqual([
      { creatorId: "cr1", price: "450 € netto / Drehtag", note: "inkl. 2 Reels" },
      { creatorId: "cr2", price: "", note: "" },
    ]);
    expect(result.value.active).toBe(true);
  });

  it("needs a customer and refuses markup, bad ids and too many creators", () => {
    expect(validateOfferInput({ ...valid, customer: " " }).ok).toBe(false);
    expect(validateOfferInput({ ...valid, title: "<b>Hi</b>" }).ok).toBe(false);
    expect(validateOfferInput({ ...valid, message: "a<script>" }).ok).toBe(false);
    expect(validateOfferInput({ ...valid, items: [{ creatorId: "../x", price: "", note: "" }] }).ok).toBe(false);
    const many = Array.from({ length: 13 }, (_, i) => ({ creatorId: `c${i}`, price: "", note: "" }));
    expect(validateOfferInput({ ...valid, items: many }).ok).toBe(false);
  });

  it("only switches the link on when asked", () => {
    const result = validateOfferInput({ ...valid, active: "yes" });
    expect(result.ok && result.value.active).toBe(false);
  });
});

describe("chosenItems", () => {
  const offer = {
    items: [
      { creatorId: "a", price: "1", note: "" },
      { creatorId: "b", price: "2", note: "" },
      { creatorId: "c", price: "3", note: "" },
    ],
  };

  it("returns the picked creators in the order of the offer", () => {
    expect(chosenItems(offer, ["c", "a", "a"])?.map((item) => item.creatorId)).toEqual(["a", "c"]);
  });

  it("refuses an empty choice or creators outside the offer", () => {
    expect(chosenItems(offer, [])).toBeNull();
    expect(chosenItems(offer, "a")).toBeNull();
    expect(chosenItems(offer, ["a", "x"])).toBeNull();
  });
});

describe("helpers", () => {
  it("builds the link and the headline", () => {
    expect(offerPath("Ab3_-Ab3_-Ab3_-Ab3_-Ab3_")).toBe("/angebot/Ab3_-Ab3_-Ab3_-Ab3_-Ab3_");
    expect(offerHeadline({ title: "", customer: "MyZeil" })).toBe("Creator-Vorschläge für MyZeil");
    expect(offerHeadline({ title: "Oster-Kampagne", customer: "MyZeil" })).toBe("Oster-Kampagne");
    expect(isOfferToken("short")).toBe(false);
  });

  it("fills defaults for stored offers and drops broken entries", () => {
    const offer = toOffer("o1", {
      token: "bad",
      items: [{ creatorId: "cr1", price: "450 €", note: "" }, { creatorId: "../x", price: "", note: "" }],
    });
    expect(offer.token).toBe("");
    expect(offer.items).toEqual([{ creatorId: "cr1", price: "450 €", note: "" }]);
    expect(offer.active).toBe(false);
    expect(offer.requests).toEqual([]);
  });
});
