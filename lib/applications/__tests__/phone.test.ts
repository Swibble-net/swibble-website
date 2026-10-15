import { describe, expect, it } from "vitest";
import { PHONE_COUNTRIES, PINNED_PHONE_COUNTRIES, combinePhone, flagEmoji, phoneCountry } from "../phone";
import { normalizePhone } from "../validation";

describe("combinePhone", () => {
  it("drops the trunk 0 and adds the country code", () => {
    expect(combinePhone("DE", "1782632310")).toBe("+491782632310");
    expect(combinePhone("DE", "0151 234 5678")).toBe("+491512345678");
    expect(combinePhone("AT", "0664/1234567")).toBe("+436641234567");
    expect(normalizePhone(combinePhone("DE", "1782632310"))).toBe("+491782632310");
  });

  it("keeps numbers typed with + or 00 as they are", () => {
    expect(combinePhone("DE", "+31 6 12345678")).toBe("+31 6 12345678");
    expect(combinePhone("DE", "0031612345678")).toBe("0031612345678");
    expect(normalizePhone(combinePhone("DE", "0031612345678"))).toBe("+31612345678");
  });

  it("leaves empty and digit-free input to the validation", () => {
    expect(combinePhone("DE", "  ")).toBe("");
    expect(combinePhone("DE", "abc")).toBe("abc");
  });
});

describe("country list", () => {
  it("is sorted A–Z by German name and has unique codes", () => {
    const fold = (s: string) => s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
    const names = PHONE_COUNTRIES.map((c) => fold(c.name));
    expect(names).toEqual([...names].sort());
    expect(new Set(PHONE_COUNTRIES.map((c) => c.code)).size).toBe(PHONE_COUNTRIES.length);
  });

  it("pins Germany on top and keeps it in the list", () => {
    expect(PINNED_PHONE_COUNTRIES[0]).toBe("DE");
    expect(PHONE_COUNTRIES.some((c) => c.code === "DE")).toBe(true);
  });

  it("falls back to Germany and builds flags", () => {
    expect(phoneCountry("??").code).toBe("DE");
    expect(flagEmoji("DE")).toBe("🇩🇪");
  });
});
