import { describe, expect, it } from "vitest";
import {
  ABOUT_MAX_LENGTH,
  CONTACT_CONSENT_TEXT,
  GUARDIAN_CONFIRM_TEXT,
  MIN_APPLICATION_AGE,
} from "../config";
import {
  normalizeEmail,
  normalizePhone,
  validateApplication,
} from "../validation";

// Fixed "now": 19 September 2026, midday in Germany.
const NOW = new Date("2026-09-19T10:00:00Z");

const adult = {
  roles: ["video", "model"],
  firstName: "  Testina ",
  lastName: "Testperson",
  birthDate: "2000-01-15",
  postalCode: "52064",
  city: "Teststadt",
  email: "Testina@Example.com",
  phone: "0151 2345678",
  tiktok: "@testina.test",
  instagram: "",
  snapchat: "",
  youtube: "",
  about: "Nur ein Test.",
  center: "demo-center",
  contactConsent: true,
  privacyAck: true,
};

const minor = {
  ...adult,
  birthDate: "2010-05-01",
  guardian: {
    name: "Erika Testperson",
    phone: "0170 1234567",
    email: "",
    confirmed: true,
  },
};

function errorsOf(input: unknown) {
  const result = validateApplication(input, NOW);
  return result.ok ? {} : result.errors;
}

describe("validateApplication – adults", () => {
  it("accepts and normalises a valid application", () => {
    const result = validateApplication(adult, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.isMinor).toBe(false);
    expect(result.age).toBe(26);
    expect(result.value).toMatchObject({
      roles: ["video", "model"],
      firstName: "Testina",
      email: "testina@example.com",
      phone: "+491512345678",
      socials: { tiktok: "testina.test", instagram: "" },
      center: "demo-center",
      guardian: null,
    });
  });

  it("discards guardian data sent for an adult", () => {
    const result = validateApplication(
      { ...adult, guardian: minor.guardian },
      NOW,
    );
    expect(result.ok && result.value.guardian).toBeNull();
  });

  it("rejects non-object payloads with errors for every required field", () => {
    for (const input of [null, undefined, "x", 42, []]) {
      const errors = errorsOf(input);
      for (const field of [
        "roles",
        "firstName",
        "lastName",
        "birthDate",
        "postalCode",
        "city",
        "email",
        "phone",
        "socials",
        "contactConsent",
        "privacyAck",
      ]) {
        expect(errors).toHaveProperty(field);
      }
    }
  });

  it("only accepts whitelisted roles", () => {
    expect(errorsOf({ ...adult, roles: [] })).toHaveProperty("roles");
    expect(errorsOf({ ...adult, roles: "video" })).toHaveProperty("roles");
    expect(errorsOf({ ...adult, roles: ["video", "admin"] })).toHaveProperty(
      "roles",
    );
    expect(errorsOf({ ...adult, roles: [1] })).toHaveProperty("roles");
  });

  it("checks types and lengths of text fields", () => {
    expect(errorsOf({ ...adult, firstName: 5 })).toHaveProperty("firstName");
    expect(errorsOf({ ...adult, firstName: "x".repeat(61) })).toHaveProperty(
      "firstName",
    );
    expect(errorsOf({ ...adult, lastName: "<b>Test</b>" })).toHaveProperty(
      "lastName",
    );
    expect(errorsOf({ ...adult, city: "" })).toHaveProperty("city");
    expect(
      errorsOf({ ...adult, about: "x".repeat(ABOUT_MAX_LENGTH + 1) }),
    ).toHaveProperty("about");
    expect(errorsOf({ ...adult, about: "x".repeat(ABOUT_MAX_LENGTH) })).toEqual(
      {},
    );
  });

  it("validates postal code, e-mail and phone formats", () => {
    expect(errorsOf({ ...adult, postalCode: "5206" })).toEqual({});
    expect(errorsOf({ ...adult, postalCode: "520645" })).toHaveProperty(
      "postalCode",
    );
    expect(errorsOf({ ...adult, postalCode: "ABCDE" })).toHaveProperty(
      "postalCode",
    );
    expect(errorsOf({ ...adult, email: "test@" })).toHaveProperty("email");
    expect(errorsOf({ ...adult, email: "a b@example.com" })).toHaveProperty(
      "email",
    );
    expect(errorsOf({ ...adult, phone: "12345" })).toHaveProperty("phone");
    expect(errorsOf({ ...adult, phone: "anrufen bitte" })).toHaveProperty(
      "phone",
    );
  });

  it("requires TikTok or Instagram; other platforms are optional", () => {
    expect(errorsOf({ ...adult, tiktok: "" })).toHaveProperty("socials");
    expect(
      errorsOf({ ...adult, tiktok: "", snapchat: "testsnap" }),
    ).toHaveProperty("socials");
    expect(errorsOf({ ...adult, tiktok: "", instagram: "@test.insta" })).toEqual(
      {},
    );
    // An invalid handle gets its own message instead of the generic one.
    const errors = errorsOf({ ...adult, tiktok: "not a handle" });
    expect(errors).toHaveProperty("tiktok");
    expect(errors).not.toHaveProperty("socials");
  });

  it("requires both consents to be literally true", () => {
    expect(errorsOf({ ...adult, contactConsent: false })).toHaveProperty(
      "contactConsent",
    );
    expect(errorsOf({ ...adult, contactConsent: "true" })).toHaveProperty(
      "contactConsent",
    );
    expect(errorsOf({ ...adult, privacyAck: undefined })).toHaveProperty(
      "privacyAck",
    );
  });

  it("accepts an empty center and rejects malformed slugs", () => {
    expect(errorsOf({ ...adult, center: "" })).toEqual({});
    expect(errorsOf({ ...adult, center: undefined })).toEqual({});
    expect(errorsOf({ ...adult, center: "../admin" })).toHaveProperty("center");
    expect(errorsOf({ ...adult, center: "a".repeat(81) })).toHaveProperty(
      "center",
    );
  });
});

describe("validateApplication – birth date and age", () => {
  it("rejects implausible birth dates", () => {
    for (const birthDate of [
      "",
      "01.01.2000",
      "2023-02-29",
      "2027-01-01", // future
      "2026-09-20", // tomorrow
      "1900-01-01", // older than the plausibility ceiling
    ]) {
      expect(errorsOf({ ...adult, birthDate })).toHaveProperty("birthDate");
    }
  });

  it("computes the age on the server: 18th birthday today = adult", () => {
    const result = validateApplication(
      { ...adult, birthDate: "2008-09-19" },
      NOW,
    );
    expect(result.ok && result.isMinor).toBe(false);
    expect(result.ok && result.age).toBe(18);
  });

  it("18th birthday tomorrow = minor, guardian section becomes mandatory", () => {
    const errors = errorsOf({ ...adult, birthDate: "2008-09-20" });
    expect(errors).toHaveProperty("guardianName");
    expect(errors).toHaveProperty("guardianContact");
    expect(errors).toHaveProperty("guardianConfirmed");
  });

  it("uses the German date around midnight UTC", () => {
    // 22:30 UTC on the 18th is already the 19th in Berlin → birthday reached.
    const result = validateApplication(
      { ...adult, birthDate: "2008-09-19" },
      new Date("2026-09-18T22:30:00Z"),
    );
    expect(result.ok && result.isMinor).toBe(false);
  });
});

describe("validateApplication – minors", () => {
  it("accepts a minor with complete guardian data", () => {
    const result = validateApplication(minor, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isMinor).toBe(true);
    expect(result.age).toBe(16);
    expect(result.value.guardian).toEqual({
      name: "Erika Testperson",
      phone: "+491701234567",
      email: "",
      confirmed: true,
    });
  });

  it("has no minimum age: young children may apply with guardian consent", () => {
    const result = validateApplication({ ...minor, birthDate: "2019-03-01" }, NOW);
    expect(result.ok).toBe(true);
    expect(result.ok && result.age).toBe(7);
    expect(result.ok && result.isMinor).toBe(true);
    // …but never without the guardian section.
    expect(
      errorsOf({ ...minor, birthDate: "2019-03-01", guardian: undefined }),
    ).toHaveProperty("guardianName");
  });

  it("accepts an e-mail address instead of a phone number", () => {
    const result = validateApplication(
      {
        ...minor,
        guardian: { ...minor.guardian, phone: "", email: "Eltern@Example.com" },
      },
      NOW,
    );
    expect(result.ok && result.value.guardian?.email).toBe("eltern@example.com");
  });

  it("rejects missing or invalid guardian data", () => {
    expect(errorsOf({ ...minor, guardian: undefined })).toHaveProperty(
      "guardianName",
    );
    expect(errorsOf({ ...minor, guardian: "Mama" })).toHaveProperty(
      "guardianName",
    );
    expect(
      errorsOf({ ...minor, guardian: { ...minor.guardian, phone: "" } }),
    ).toHaveProperty("guardianContact");
    expect(
      errorsOf({ ...minor, guardian: { ...minor.guardian, phone: "123" } }),
    ).toHaveProperty("guardianPhone");
    expect(
      errorsOf({ ...minor, guardian: { ...minor.guardian, email: "x@" } }),
    ).toHaveProperty("guardianEmail");
    expect(
      errorsOf({ ...minor, guardian: { ...minor.guardian, confirmed: false } }),
    ).toHaveProperty("guardianConfirmed");
  });
});

describe("normalizePhone / normalizeEmail", () => {
  it("normalises German and international numbers", () => {
    expect(normalizePhone("0151 234 56 78")).toBe("+491512345678");
    expect(normalizePhone("+49 (151) 234-5678")).toBe("+491512345678");
    expect(normalizePhone("0031 6 12345678")).toBe("+31612345678");
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("+0123456789")).toBe("");
    expect(normalizePhone(undefined)).toBe("");
  });

  it("lowercases valid addresses and rejects the rest", () => {
    expect(normalizeEmail(" Test@Example.COM ")).toBe("test@example.com");
    expect(normalizeEmail("test@example")).toBe("");
    expect(normalizeEmail(`${"a".repeat(250)}@example.com`)).toBe("");
    expect(normalizeEmail(null)).toBe("");
  });
});

describe("consent wording", () => {
  it("has no age limit configured", () => {
    expect(MIN_APPLICATION_AGE).toBeNull();
  });

  it("covers the applicant pool and storage until withdrawal, without a fixed period", () => {
    expect(CONTACT_CONSENT_TEXT).toMatch(/Bewerberpool/);
    expect(CONTACT_CONSENT_TEXT).toMatch(/bis zu meinem Widerruf/);
    expect(CONTACT_CONSENT_TEXT).toMatch(/info@swibble\.net/);
    expect(CONTACT_CONSENT_TEXT).not.toMatch(/Monate|für immer|unbegrenzt/);
  });

  it("guardian confirmation covers processing of the child's data", () => {
    expect(GUARDIAN_CONFIRM_TEXT).toMatch(/Verarbeitung meiner Daten/);
  });
});
