import { describe, expect, it } from "vitest";
import { CTA_URL } from "@/lib/cta";
import {
  EMAIL_LOGO_ATTACHMENT,
  EMAIL_LOGO_DATA_URI,
  buildConfirmationHtml,
  buildConfirmationSubject,
  buildConfirmationText,
  escapeHtml,
  summaryRows,
} from "@/lib/contact/confirmation";
import { parseInquiry, type Inquiry } from "@/lib/contact/inquiry";

const parseOk = (body: unknown): Inquiry => {
  const result = parseInquiry(body);
  if (!result.ok) throw new Error(`expected a valid inquiry, got "${result.error}"`);
  return result.inquiry;
};

const FULL = parseOk({
  email: "max@example.com",
  number: "+49 241 123456",
  message: "Wir planen einen Relaunch.\nStart im Herbst.",
  name: "Max Mustermann",
  company: "Muster GmbH",
  location: "Aachen",
  services: ["social-media", "design"],
  goal: "reach",
  budget: "2k-5k",
  timeframe: "1-3-months",
});

const MINIMAL = parseOk({ email: "max@example.com", services: ["unsure"] });

describe("confirmation mail", () => {
  it("has a fixed subject without visitor input", () => {
    expect(buildConfirmationSubject()).toBe("Deine Anfrage bei Swibble ist angekommen");
  });

  it("repeats every answer and leaves out empty ones", () => {
    expect(summaryRows(FULL).map((row) => row.label)).toEqual([
      "Leistungen",
      "Ziel",
      "Budgetrahmen",
      "Gewünschter Start",
      "Name",
      "Unternehmen",
      "Stadt / Ort",
      "E-Mail",
      "Telefon",
    ]);
    expect(summaryRows(MINIMAL)).toEqual([
      { label: "Leistungen", value: "Noch unsicher" },
      { label: "E-Mail", value: "max@example.com" },
    ]);
  });

  it("greets by first name and contains the inquiry, the message and the booking link", () => {
    const html = buildConfirmationHtml(FULL);
    expect(html).toContain("Danke für deine Anfrage, Max!");
    expect(html).toContain("Social Media, Design");
    expect(html).toContain("2.000 – 5.000 €");
    expect(html).toContain("Wir planen einen Relaunch.<br>Start im Herbst.");
    expect(html).toContain(`href="${CTA_URL}"`);

    const text = buildConfirmationText(FULL);
    expect(text).toContain("Leistungen: Social Media, Design");
    expect(text).toContain("DEINE NACHRICHT\nWir planen einen Relaunch.");
    expect(text).toContain(CTA_URL);
  });

  it("shows the Swibble logo as an inline image, or from a given source in previews", () => {
    expect(EMAIL_LOGO_ATTACHMENT).toMatchObject({ cid: "swibble-logo", contentType: "image/png" });
    // PNG signature
    expect(EMAIL_LOGO_ATTACHMENT.content.subarray(1, 4).toString()).toBe("PNG");
    expect(buildConfirmationHtml(FULL)).toContain('<img src="cid:swibble-logo"');
    expect(buildConfirmationHtml(FULL, EMAIL_LOGO_DATA_URI)).toContain('<img src="data:image/png;base64,');
  });

  it("works without a name and without a message", () => {
    const html = buildConfirmationHtml(MINIMAL);
    expect(html).toContain("Danke für deine Anfrage!");
    expect(html).not.toContain("Deine Nachricht");
    expect(buildConfirmationText(MINIMAL)).not.toContain("DEINE NACHRICHT");
  });

  it("escapes visitor input in the HTML", () => {
    const inquiry = parseOk({
      email: "max@example.com",
      services: ["design"],
      name: `<img src=x onerror=alert(1)>`,
      company: `"Muster" & Söhne`,
      message: `<a href="https://evil.example">Klick</a>`,
    });
    const html = buildConfirmationHtml(inquiry);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain(`<a href="https://evil.example"`);
    expect(html).toContain("&lt;img");
    expect(html).toContain("&quot;Muster&quot; &amp; Söhne");
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});
