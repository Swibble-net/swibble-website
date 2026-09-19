import { describe, expect, it } from "vitest";
import { parseInquiry, type Inquiry } from "@/lib/contact/inquiry";
import { buildNotificationHtml } from "@/lib/contact/notification";

const parseOk = (body: unknown): Inquiry => {
  const result = parseInquiry(body);
  if (!result.ok) throw new Error(`expected a valid inquiry, got "${result.error}"`);
  return result.inquiry;
};

describe("notification mail for Swibble", () => {
  it("shows the inquiry, the sender and a reply button", () => {
    const html = buildNotificationHtml(
      parseOk({
        email: "max@example.com",
        name: "Max Mustermann",
        company: "Muster GmbH",
        services: ["social-media", "design"],
        goal: "reach",
        budget: "2k-5k",
        message: "Wir planen einen Relaunch.",
      }),
    );
    expect(html).toContain("Neue Anfrage: Social Media, Design");
    expect(html).toContain("Max Mustermann (Muster GmbH) hat über das Formular");
    expect(html).toContain("2.000 – 5.000 €");
    expect(html).toContain("Wir planen einen Relaunch.");
    expect(html).toContain('href="mailto:max@example.com"');
    expect(html).toContain('<img src="cid:swibble-logo"');
  });

  it("falls back to the e-mail address and escapes visitor input", () => {
    const html = buildNotificationHtml(
      parseOk({ email: "max@example.com", services: ["unsure"], message: "<script>alert(1)</script>" }),
    );
    expect(html).toContain("max@example.com hat über das Formular");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
