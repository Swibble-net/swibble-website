import { describe, expect, it } from "vitest";
import { buildApplicantMail, buildGuardianMail, buildInternalMail } from "../mails";
import { toApplication } from "../store";

const adult = toApplication("app-1", {
  roles: ["video", "kamera"],
  firstName: "Testina",
  lastName: "Testperson",
  birthDate: "2000-01-15",
  email: "testina@example.com",
  phone: "+491510000000",
  city: "Teststadt",
  center: "demo-center",
  centerName: "Demo-Center",
  consent: {
    contactText: "KONTAKT-TEXT",
    privacyText: "DATENSCHUTZ-TEXT",
    mediaText: "MEDIA-TEXT",
    guardianText: "",
    guardianDeclaration: "",
    version: "test",
    givenAt: 1,
  },
});

const minor = toApplication("app-2", {
  ...adult,
  firstName: "Testo",
  isMinor: true,
  guardian: {
    name: "Erika Testperson",
    phone: "+491700000002",
    email: "eltern@example.com",
    address: "Testweg 1",
    method: "signature",
    confirmed: true,
  },
  consent: { ...adult.consent, guardianDeclaration: "ERKLAERUNG IM WORTLAUT" },
});

describe("buildApplicantMail", () => {
  const mail = buildApplicantMail(adult);

  it("confirms the application with roles, center and consents", () => {
    expect(mail.subject).toMatch(/Bewerbung/);
    for (const part of [mail.text, mail.html]) {
      expect(part).toContain("Testina");
      expect(part).toContain("Im Video mitmachen, Kamerabedienung");
      expect(part).toContain("Demo-Center");
      expect(part).toContain("KONTAKT-TEXT");
      expect(part).toContain("MEDIA-TEXT");
      expect(part).toContain("info@swibble.net");
    }
    expect(mail.text).toContain("/linkhub/demo-center");
  });

  it("leaves out phone number, birth date and city", () => {
    for (const part of [mail.text, mail.html]) {
      expect(part).not.toContain("+491510000000");
      expect(part).not.toContain("2000-01-15");
      expect(part).not.toContain("Teststadt");
    }
  });

  it("escapes HTML in user-supplied values", () => {
    const evil = buildApplicantMail({ ...adult, firstName: "<img src=x onerror=1>" });
    expect(evil.html).not.toContain("<img src=x");
    expect(evil.html).toContain("&lt;img");
  });
});

describe("buildGuardianMail", () => {
  it("is only built for minors with a guardian e-mail address", () => {
    expect(buildGuardianMail(adult)).toBeNull();
    expect(
      buildGuardianMail({ ...minor, guardian: { ...minor.guardian!, email: "" } }),
    ).toBeNull();
    expect(buildGuardianMail(minor)).not.toBeNull();
  });

  it("uses the formal address and repeats the signed declaration", () => {
    const mail = buildGuardianMail(minor)!;
    expect(mail.text).toContain("Guten Tag Erika Testperson");
    expect(mail.text).toContain("ERKLAERUNG IM WORTLAUT");
    expect(mail.text).toContain("online unterschrieben");
    expect(mail.text).toMatch(/widerrufen/);
    expect(mail.text).not.toContain("+491510000000");
    expect(mail.text).not.toContain("+491700000002");
  });

  it("describes an uploaded paper form without a declaration text", () => {
    const mail = buildGuardianMail({
      ...minor,
      guardian: { ...minor.guardian!, method: "upload" },
    })!;
    expect(mail.text).toContain("unterschriebenes Formular hochgeladen");
    expect(mail.text).not.toContain("ERKLAERUNG IM WORTLAUT");
  });
});

describe("buildInternalMail", () => {
  it("contains name, roles, center and the admin link — no contact data", () => {
    const mail = buildInternalMail(minor, "https://example.test/admin/bewerbungen/app-2");
    expect(mail.subject).toContain("Testo Testperson");
    expect(mail.text).toContain("https://example.test/admin/bewerbungen/app-2");
    expect(mail.text).toContain("Minderjährig: ja");
    for (const secret of ["testina@example.com", "+491510000000", "eltern@example.com"]) {
      expect(mail.text).not.toContain(secret);
      expect(mail.html).not.toContain(secret);
    }
  });
});
