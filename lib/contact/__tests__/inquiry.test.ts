import { describe, expect, it } from "vitest";
import { MESSAGE_MAX_LENGTH } from "@/lib/cta";
import { buildSubject, buildText, cleanLine, parseInquiry, type Inquiry } from "@/lib/contact/inquiry";

const FUNNEL_BODY = {
  email: "max@example.com",
  number: "+49 241 123456",
  message: "Wir planen einen Relaunch.",
  name: "Max Mustermann",
  company: "Muster GmbH",
  location: "Aachen",
  services: ["design", "social-media"],
  goals: ["customers", "reach"],
  budget: "2k-5k",
  timeframe: "1-3-months",
};

const parseOk = (body: unknown): Inquiry => {
  const result = parseInquiry(body);
  if (!result.ok) throw new Error(`expected a valid inquiry, got "${result.error}"`);
  return result.inquiry;
};

const errorOf = (body: unknown) => {
  const result = parseInquiry(body);
  return result.ok ? "" : result.error;
};

describe("parseInquiry – funnel body", () => {
  it("accepts a complete inquiry and normalises the services", () => {
    const inquiry = parseOk({ ...FUNNEL_BODY, services: ["design", "social-media", "design"] });
    expect(inquiry).toMatchObject({ legacy: false, services: ["social-media", "design"], goals: ["reach", "customers"], budget: "2k-5k" });
  });

  it("needs only the e-mail and a service", () => {
    const inquiry = parseOk({ email: " max@example.com ", services: ["unsure"] });
    expect(inquiry).toMatchObject({ email: "max@example.com", message: "", name: "", goals: [], budget: "", timeframe: "" });
  });

  it("rejects values outside the whitelists", () => {
    expect(errorOf({ ...FUNNEL_BODY, services: ["seo"] })).toBe("Invalid services");
    expect(errorOf({ ...FUNNEL_BODY, services: [] })).toBe("Invalid services");
    expect(errorOf({ ...FUNNEL_BODY, services: "design" })).toBe("Invalid services");
    expect(errorOf({ ...FUNNEL_BODY, services: [{ value: "design" }] })).toBe("Invalid services");
    expect(errorOf({ ...FUNNEL_BODY, services: undefined })).toBe("Invalid services");
    expect(errorOf({ ...FUNNEL_BODY, goals: ["world-domination"] })).toBe("Invalid goal");
    expect(errorOf({ ...FUNNEL_BODY, goals: "reach" })).toBe("Invalid goal");
    expect(errorOf({ ...FUNNEL_BODY, goals: undefined, goal: "world-domination" })).toBe("Invalid goal");
    expect(errorOf({ ...FUNNEL_BODY, budget: "1 Mio" })).toBe("Invalid budget");
    expect(errorOf({ ...FUNNEL_BODY, timeframe: ["asap"] })).toBe("Invalid timeframe");
  });

  it("still accepts the single goal of earlier form versions", () => {
    expect(parseOk({ email: "max@example.com", services: ["design"], goal: "branding" }).goals).toEqual(["branding"]);
  });

  it("rejects wrong types and overlong fields", () => {
    expect(errorOf({ ...FUNNEL_BODY, name: { first: "Max" } })).toBe("Invalid name");
    expect(errorOf({ ...FUNNEL_BODY, name: "x".repeat(101) })).toBe("Invalid name");
    expect(errorOf({ ...FUNNEL_BODY, company: "x".repeat(121) })).toBe("Invalid company");
    expect(errorOf({ ...FUNNEL_BODY, location: "x".repeat(101) })).toBe("Invalid location");
    expect(errorOf({ ...FUNNEL_BODY, location: { city: "Aachen" } })).toBe("Invalid location");
    expect(errorOf({ ...FUNNEL_BODY, number: "1".repeat(41) })).toBe("Invalid number");
    expect(errorOf({ ...FUNNEL_BODY, number: 49241 })).toBe("Invalid number");
    expect(errorOf({ ...FUNNEL_BODY, message: "x".repeat(MESSAGE_MAX_LENGTH + 1) })).toBe("Message too long");
    expect(errorOf({ ...FUNNEL_BODY, message: ["x"] })).toBe("Message too long");
  });

  it("rejects a missing or invalid e-mail", () => {
    expect(errorOf({ ...FUNNEL_BODY, email: "" })).toBe("Bad request!");
    expect(errorOf({ ...FUNNEL_BODY, email: "max@example" })).toBe("Invalid email");
    expect(errorOf({ ...FUNNEL_BODY, email: ["max@example.com"] })).toBe("Invalid email");
    expect(errorOf({ ...FUNNEL_BODY, email: "max@example.com\r\nBcc: spam@evil.example" })).toBe("Invalid email");
  });

  it("rejects bodies that are not objects", () => {
    for (const body of [undefined, null, "email=max@example.com", 42, [FUNNEL_BODY]]) {
      expect(errorOf(body)).toBe("Bad request!");
    }
  });
});

describe("parseInquiry – body of the former form", () => {
  it("stays compatible with email, message and number", () => {
    const inquiry = parseOk({ email: "max@example.com", message: "Hallo!", number: "0241 123" });
    expect(inquiry).toMatchObject({ legacy: true, services: [], message: "Hallo!", number: "0241 123" });
    expect(buildSubject(inquiry)).toBe("Message from max@example.com. 0241 123");
    expect(buildText(inquiry)).toBe("Hallo!");
  });

  it("keeps the former validation", () => {
    expect(errorOf({ email: "max@example.com" })).toBe("Bad request!");
    expect(errorOf({ message: "Hallo!" })).toBe("Bad request!");
    expect(errorOf({ email: "max@example.com", message: "x".repeat(MESSAGE_MAX_LENGTH + 1) })).toBe("Message too long");
    expect(errorOf({ email: "max@example.com", message: { text: "Hallo" } })).toBe("Message too long");
  });
});

describe("mail", () => {
  it("builds a readable subject", () => {
    expect(buildSubject(parseOk(FUNNEL_BODY))).toBe(
      "Neue Anfrage: Social Media, Design – Budget 2.000 – 5.000 € – Max Mustermann (Muster GmbH)",
    );
    expect(buildSubject(parseOk({ email: "max@example.com", services: ["unsure"] }))).toBe(
      "Neue Anfrage: Noch unsicher – max@example.com",
    );
  });

  it("keeps line breaks and control characters out of the subject", () => {
    const inquiry = parseOk({ ...FUNNEL_BODY, name: "Max\r\nBcc: spam@evil.example", company: "Muster\n\tGmbH\u2028" });
    const subject = buildSubject(inquiry);
    expect(subject).not.toMatch(/[\r\n\t\u2028]/);
    expect(subject).toContain("Max Bcc: spam@evil.example (Muster GmbH)");
    expect(cleanLine(" a\r\n b\u0000c ")).toBe("a b c");
  });

  it("limits the subject length", () => {
    const inquiry = parseOk({ ...FUNNEL_BODY, name: "x".repeat(100), company: "y".repeat(120) });
    expect(buildSubject(inquiry).length).toBeLessThanOrEqual(200);
  });

  it("lists all answers in the text and marks empty ones", () => {
    const text = buildText(parseOk(FUNNEL_BODY));
    expect(text).toContain("Leistungen: Social Media, Design");
    expect(text).toContain("Ziele:      Mehr Reichweite, Mehr Kunden / Besucher");
    expect(text).toContain("Budget:     2.000 – 5.000 €");
    expect(text).toContain("Start:      In 1–3 Monaten");
    expect(text).toContain("Unternehmen: Muster GmbH");
    expect(text).toContain("Ort:         Aachen");
    expect(text).toContain("E-Mail:      max@example.com");
    expect(text).toContain("NACHRICHT\nWir planen einen Relaunch.");

    const minimal = buildText(parseOk({ email: "max@example.com", services: ["unsure"] }));
    expect(minimal).toContain("Budget:     –");
    expect(minimal).toContain("NACHRICHT\n–");
  });
});
