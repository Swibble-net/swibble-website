import { describe, expect, it } from "vitest";
import {
  ABOUT_MAX_LENGTH,
  CONTACT_CONSENT_TEXT,
  GUARDIAN_CONFIRM_TEXT,
  MEDIA_CONSENT_TEXT,
  MIN_APPLICATION_AGE,
  guardianDeclarationText,
} from "../config";
import {
  normalizeEmail,
  normalizePhone,
  normalizePortfolioUrl,
  validateApplication,
  validateCreatorApplication,
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
  mediaConsent: true,
};

const minor = {
  ...adult,
  birthDate: "2010-05-01",
  guardian: {
    name: "Erika Testperson",
    phone: "0170 1234567",
    email: "",
    address: " Testweg 1, 52064 Teststadt ",
    method: "signature",
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
        "contactConsent",
        "privacyAck",
        "mediaConsent",
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

  it("rejects roles that are switched off", () => {
    const only = (roles: string[]) =>
      validateApplication({ ...adult, roles }, NOW, ["video"]);
    expect(only(["video"]).ok).toBe(true);
    expect(only(["video", "model"]).ok).toBe(false);
    expect(only(["kamera"]).ok).toBe(false);
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

  it("treats all social handles as optional but validates given ones", () => {
    expect(
      errorsOf({ ...adult, tiktok: "", instagram: "", snapchat: "", youtube: "" }),
    ).toEqual({});
    expect(errorsOf({ ...adult, tiktok: "", instagram: "@test.insta" })).toEqual(
      {},
    );
    expect(errorsOf({ ...adult, tiktok: "not a handle" })).toHaveProperty(
      "tiktok",
    );
    expect(errorsOf({ ...adult, youtube: "<script>" })).toHaveProperty("youtube");
  });

  it("accepts the camera operator role", () => {
    const result = validateApplication({ ...adult, roles: ["kamera"] }, NOW);
    expect(result.ok && result.value.roles).toEqual(["kamera"]);
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
      address: "Testweg 1, 52064 Teststadt",
      method: "signature",
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

describe("publication release and guardian method", () => {
  it("requires the publication / marketing release from everyone", () => {
    expect(errorsOf({ ...adult, mediaConsent: false })).toHaveProperty(
      "mediaConsent",
    );
    expect(errorsOf({ ...adult, mediaConsent: undefined })).toHaveProperty(
      "mediaConsent",
    );
    expect(errorsOf({ ...minor, mediaConsent: "yes" })).toHaveProperty(
      "mediaConsent",
    );
  });

  it("falls back to the upload method for unknown values", () => {
    const result = validateApplication(
      { ...minor, guardian: { ...minor.guardian, method: "fax" } },
      NOW,
    );
    expect(result.ok && result.value.guardian?.method).toBe("upload");
  });

  it("limits the guardian address", () => {
    expect(
      errorsOf({
        ...minor,
        guardian: { ...minor.guardian, address: "x".repeat(201) },
      }),
    ).toHaveProperty("guardianAddress");
  });

  it("the release covers unlimited marketing use and restricts withdrawal", () => {
    expect(MEDIA_CONSENT_TEXT).toMatch(/Marketing- und Werbezwecke/);
    expect(MEDIA_CONSENT_TEXT).toMatch(/nur aus wichtigem Grund/);
    const declaration = guardianDeclarationText(["video", "kamera"]);
    expect(declaration).toMatch(/Im Video mitmachen, Kamerabedienung/);
    expect(declaration).toMatch(/Veröffentlichung und Marketing/);
    expect(declaration).toMatch(/Datenverarbeitung/);
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

describe("validateCreatorApplication", () => {
  const creator = {
    pool: "creator",
    roles: ["model", "moderation"],
    firstName: "Carla",
    lastName: "Creator",
    birthDate: "1998-03-03",
    postalCode: "52064",
    city: "Aachen",
    gender: "female",
    heightCm: "172",
    nationalities: ["DE", "ru"],
    languages: ["de", "ru", "en"],
    email: "carla@example.com",
    phone: "0152 0000003",
    tiktok: "",
    instagram: "https://www.instagram.com/carla.creates/",
    snapchat: "",
    youtube: "",
    about: "",
    portfolioUrl: "carla.example/portfolio",
    releaseAccepted: true,
    privacyAck: true,
  };

  const errorsOfCreator = (input: unknown) => {
    const result = validateCreatorApplication(input, NOW);
    return result.ok ? {} : result.errors;
  };

  it("accepts and normalises a valid creator application", () => {
    const result = validateCreatorApplication(creator, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isMinor).toBe(false);
    expect(result.value).toMatchObject({
      roles: ["model", "moderation"],
      phone: "+491520000003",
      socials: { instagram: "carla.creates" },
      portfolioUrl: "https://carla.example/portfolio",
      center: "",
      guardian: null,
      gender: "female",
      heightCm: 172,
      nationalities: ["DE", "RU"],
      languages: ["de", "ru", "en"],
    });
  });

  it("asks for gender, height, nationality and languages", () => {
    const missing = errorsOfCreator({
      ...creator,
      gender: "",
      heightCm: "",
      nationalities: [],
      languages: [],
    });
    expect(missing.gender).toBeDefined();
    expect(missing.heightCm).toMatch(/Zentimetern/);
    expect(missing.nationalities).toBeDefined();
    expect(missing.languages).toMatch(/Sprache/);

    expect(errorsOfCreator({ ...creator, gender: "robot" }).gender).toBeDefined();
    expect(errorsOfCreator({ ...creator, heightCm: "1.72" }).heightCm).toBeDefined();
    expect(errorsOfCreator({ ...creator, heightCm: "17" }).heightCm).toBeDefined();
    expect(errorsOfCreator({ ...creator, heightCm: "999" }).heightCm).toBeDefined();
    expect(errorsOfCreator({ ...creator, nationalities: ["XX"] }).nationalities).toBeDefined();
    expect(errorsOfCreator({ ...creator, nationalities: ["DE", "RU", "TR"] }).nationalities).toBeDefined();
    expect(errorsOfCreator({ ...creator, languages: ["klingon"] }).languages).toBeDefined();
  });

  it("accepts the height as a number and drops duplicate nationalities", () => {
    const result = validateCreatorApplication(
      { ...creator, heightCm: 180, nationalities: ["DE", "de"] },
      NOW,
    );
    expect(result.ok && result.value.heightCm).toBe(180);
    expect(result.ok && result.value.nationalities).toEqual(["DE"]);
  });

  it("lets minors apply with a guardian who signs online", () => {
    const minorCreator = { ...creator, birthDate: "2013-11-17" };
    const missing = errorsOfCreator(minorCreator);
    expect(missing.birthDate).toBeUndefined();
    expect(missing.guardianName).toBeDefined();
    expect(missing.guardianContact).toBeDefined();
    expect(missing.guardianConfirmed).toBeDefined();

    const result = validateCreatorApplication(
      {
        ...minorCreator,
        // A paper form isn't offered here: the method is always "signature".
        guardian: { name: "Erika Testperson", phone: "+49 170 1234567", method: "upload", confirmed: true },
      },
      NOW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isMinor).toBe(true);
    expect(result.value.guardian).toMatchObject({
      name: "Erika Testperson",
      phone: "+491701234567",
      method: "signature",
    });
  });

  it("discards guardian data of adults", () => {
    const result = validateCreatorApplication(
      { ...creator, guardian: { name: "Erika Testperson", phone: "0170 1234567", confirmed: true } },
      NOW,
    );
    expect(result.ok && result.value.guardian).toBeNull();
  });

  it("accepts promoters, also combined with other roles", () => {
    const result = validateCreatorApplication({ ...creator, roles: ["promoter", "model"] }, NOW);
    expect(result.ok && result.value.roles).toEqual(["model", "promoter"]);
  });

  it("only accepts creator roles", () => {
    expect(errorsOfCreator({ ...creator, roles: [] }).roles).toBeDefined();
    expect(errorsOfCreator({ ...creator, roles: ["video"] }).roles).toBeDefined();
    expect(errorsOfCreator({ ...creator, roles: ["creator", "kamera"] }).roles).toBeDefined();
  });

  it("asks content creators for at least one channel", () => {
    const noChannel = { ...creator, roles: ["creator"], instagram: "" };
    expect(errorsOfCreator(noChannel).socials).toMatch(/mindestens einen Kanal/);
    expect(errorsOfCreator({ ...noChannel, tiktok: "carla" }).socials).toBeUndefined();
    // A model needs no channel.
    expect(errorsOfCreator({ ...noChannel, roles: ["model"] }).socials).toBeUndefined();
    // An invalid handle is reported on its own field only.
    const invalid = errorsOfCreator({ ...noChannel, tiktok: "a b" });
    expect(invalid.tiktok).toBeDefined();
    expect(invalid.socials).toBeUndefined();
  });

  it("requires the signed release and the privacy acknowledgement", () => {
    const errors = errorsOfCreator({ ...creator, releaseAccepted: false, privacyAck: "yes" });
    expect(errors.releaseAccepted).toBeDefined();
    expect(errors.privacyAck).toBeDefined();
  });

  it("rejects a portfolio value that is not a web link", () => {
    expect(errorsOfCreator({ ...creator, portfolioUrl: "javascript:alert(1)" }).portfolioUrl).toBeDefined();
    expect(errorsOfCreator({ ...creator, portfolioUrl: "" }).portfolioUrl).toBeUndefined();
  });
});

describe("normalizePortfolioUrl", () => {
  it("adds https:// and keeps http(s) links", () => {
    expect(normalizePortfolioUrl("www.example.com")).toBe("https://www.example.com/");
    expect(normalizePortfolioUrl(" https://linktr.ee/carla ")).toBe("https://linktr.ee/carla");
    expect(normalizePortfolioUrl("http://example.de/setcard.pdf")).toBe(
      "http://example.de/setcard.pdf",
    );
    expect(normalizePortfolioUrl("")).toBe("");
  });

  it("rejects other schemes, hosts without TLD and credentials", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,x",
      "ftp://example.com",
      "localhost:3000",
      "https://192.168.0.1",
      "https://user:pw@example.com",
      "not a link",
      `https://example.com/${"x".repeat(400)}`,
    ]) {
      expect(normalizePortfolioUrl(value)).toBeNull();
    }
  });
});
