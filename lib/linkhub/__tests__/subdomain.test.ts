import { describe, expect, it } from "vitest";
import { parseSubdomain } from "../subdomain";

describe("parseSubdomain", () => {
  it("accepts and normalises plain labels", () => {
    expect(parseSubdomain(" AquisPlaza ")).toEqual({ ok: true, subdomain: "aquisplaza" });
    expect(parseSubdomain("my-zeil")).toEqual({ ok: true, subdomain: "my-zeil" });
  });

  it("reduces a full host to its label", () => {
    expect(parseSubdomain("aquisplaza.swibble.net")).toEqual({
      ok: true,
      subdomain: "aquisplaza",
    });
  });

  it("treats empty and missing values as no subdomain", () => {
    expect(parseSubdomain("")).toEqual({ ok: true, subdomain: "" });
    expect(parseSubdomain(undefined)).toEqual({ ok: true, subdomain: "" });
  });

  it("rejects invalid and reserved names", () => {
    for (const value of ["a.b", "-abc", "abc-", "äöü", "a b", "www", "assets", 5]) {
      expect(parseSubdomain(value).ok).toBe(false);
    }
  });
});
