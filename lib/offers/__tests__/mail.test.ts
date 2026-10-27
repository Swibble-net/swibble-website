import { describe, expect, it } from "vitest";
import { validateCreatorInquiry } from "@/lib/creators/inquiry";
import { buildOfferConfirmation, buildOfferNotification } from "../mail";

const inquiry = (
  validateCreatorInquiry(
    { company: "Muster GmbH", name: "Max Muster", email: "max@example.com", phone: "", message: "" },
    { messageRequired: false },
  ) as { ok: true; value: Parameters<typeof buildOfferNotification>[0] }
).value;

describe("offer mails", () => {
  it("tells Swibble who was picked, with full names and prices", () => {
    const mail = buildOfferNotification(inquiry, {
      customer: "Aquis Plaza",
      headline: "Oster-Kampagne",
      chosen: [
        { name: "Vanessa Lander", price: "450 € / Tag" },
        { name: "Karina <b>Test</b>", price: "" },
      ],
      adminUrl: "https://www.swibble.net/admin/angebote/o1",
    });
    expect(mail.subject).toBe("Angebot angefragt: Vanessa Lander, Karina <b>Test</b> – Muster GmbH");
    expect(mail.text).toContain("Vanessa Lander: 450 € / Tag");
    expect(mail.text).toContain("Preis auf Anfrage");
    expect(mail.text).toContain("2 Creator angefragt");
    expect(mail.html).not.toContain("<b>Test</b>");
  });

  it("confirms the choice to the customer with a link back", () => {
    const mail = buildOfferConfirmation(inquiry, {
      chosen: [{ name: "Vanessa", price: "450 € / Tag" }],
      offerUrl: "https://www.swibble.net/angebot/Ab3_-Ab3_-Ab3_-Ab3_-Ab3_",
    });
    expect(mail.subject).toBe("Deine Creator-Auswahl ist angekommen");
    expect(mail.text).toContain("Danke, Max!");
    expect(mail.text).toContain("Vanessa: 450 € / Tag");
    expect(mail.text).toContain("Alle Preise netto zzgl. gesetzlicher MwSt.");
    expect(mail.text).toContain("Zum Angebot: https://www.swibble.net/angebot/Ab3_-Ab3_-Ab3_-Ab3_-Ab3_");
  });
});
