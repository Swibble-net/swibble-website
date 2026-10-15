import { describe, expect, it } from "vitest";
import {
  buildInquiryConfirmation,
  buildInquiryNotification,
  validateCreatorInquiry,
} from "../inquiry";

const input = {
  company: "Muster GmbH",
  name: "Max Muster",
  email: "Max@Example.com",
  phone: "0151 1111111",
  message: "Shooting im Mai in Köln.",
};

describe("validateCreatorInquiry", () => {
  it("normalises a valid inquiry", () => {
    const result = validateCreatorInquiry(input);
    expect(result).toMatchObject({
      ok: true,
      value: { email: "max@example.com", phone: "+491511111111" },
    });
  });

  it("requires company, name, e-mail and message; phone is optional", () => {
    const result = validateCreatorInquiry({ phone: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["company", "email", "message", "name"]);
    expect(validateCreatorInquiry({ ...input, phone: "abc" }).ok).toBe(false);
  });
});

describe("inquiry mails", () => {
  const value = (validateCreatorInquiry(input) as { ok: true; value: Parameters<typeof buildInquiryNotification>[0] }).value;
  const creator = {
    name: "Testina T.",
    pageUrl: "www.swibble.net/creator/testina-t",
    adminUrl: "https://www.swibble.net/admin/creator/cr1",
  };

  it("tells Swibble who asked for whom", () => {
    const mail = buildInquiryNotification(value, creator);
    expect(mail.subject).toBe("Creator-Anfrage: Testina T. – Muster GmbH");
    expect(mail.text).toContain("max@example.com");
    expect(mail.text).toContain("Shooting im Mai");
    expect(mail.text).toContain("/admin/creator/cr1");
  });

  it("confirms to the sender without the admin link", () => {
    const mail = buildInquiryConfirmation(value, creator);
    expect(mail.subject).toContain("Testina T.");
    expect(mail.text).toContain("Danke, Max!");
    expect(mail.text).not.toContain("/admin/");
  });

  it("escapes markup in the HTML version", () => {
    const evil = buildInquiryNotification({ ...value, message: "<img src=x onerror=1>" }, creator);
    expect(evil.html).not.toContain("<img src=x");
  });
});
