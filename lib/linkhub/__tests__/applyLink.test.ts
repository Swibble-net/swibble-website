import { describe, expect, it } from "vitest";
import {
  APPLY_LINK_DEFAULT_LABEL,
  APPLY_LINK_LABEL_MAX_LENGTH,
  applyHref,
  buildApplyLink,
  parseApplyFields,
} from "../applyLink";
import { toProfile } from "../profiles";

describe("toProfile – backwards compatibility", () => {
  it("switches the apply entry on for documents without the field", () => {
    const profile = toProfile("id-1", {
      slug: "demo-center",
      name: "Demo-Center",
      subtitle: "",
      links: [],
      createdAt: 1,
      updatedAt: 1,
    });
    expect(profile.showApplyLink).toBe(true);
    expect(profile.applyLinkLabel).toBe("");
  });

  it("keeps an explicit false and a custom label", () => {
    const profile = toProfile("id-1", {
      slug: "demo-center",
      name: "Demo-Center",
      showApplyLink: false,
      applyLinkLabel: "Werde Teil des Teams",
    });
    expect(profile.showApplyLink).toBe(false);
    expect(profile.applyLinkLabel).toBe("Werde Teil des Teams");
  });
});

describe("buildApplyLink", () => {
  it("links to /mitmachen with the profile slug as center", () => {
    const link = buildApplyLink({
      slug: "demo-center",
      showApplyLink: true,
      applyLinkLabel: "",
    });
    expect(link).toMatchObject({
      label: APPLY_LINK_DEFAULT_LABEL,
      href: "/mitmachen?center=demo-center",
      external: false,
    });
  });

  it("uses the custom label when set", () => {
    const link = buildApplyLink({
      slug: "demo-center",
      showApplyLink: true,
      applyLinkLabel: "  Werde Teil des Teams ",
    });
    expect(link?.label).toBe("Werde Teil des Teams");
  });

  it("returns null when switched off", () => {
    expect(
      buildApplyLink({
        slug: "demo-center",
        showApplyLink: false,
        applyLinkLabel: "",
      }),
    ).toBeNull();
  });

  it("encodes the slug and falls back to the plain page without one", () => {
    expect(applyHref("a&b=c")).toBe("/mitmachen?center=a%26b%3Dc");
    expect(applyHref("")).toBe("/mitmachen");
  });
});

describe("parseApplyFields", () => {
  it("accepts payloads without the new fields (older clients)", () => {
    expect(parseApplyFields({})).toEqual({
      ok: true,
      showApplyLink: undefined,
      applyLinkLabel: undefined,
    });
  });

  it("passes through valid values and trims the label", () => {
    expect(
      parseApplyFields({ showApplyLink: false, applyLinkLabel: " Mach mit " }),
    ).toEqual({ ok: true, showApplyLink: false, applyLinkLabel: "Mach mit" });
  });

  it("rejects wrong types and over-long labels", () => {
    expect(parseApplyFields({ showApplyLink: "yes" }).ok).toBe(false);
    expect(parseApplyFields({ applyLinkLabel: 5 }).ok).toBe(false);
    expect(
      parseApplyFields({
        applyLinkLabel: "x".repeat(APPLY_LINK_LABEL_MAX_LENGTH + 1),
      }).ok,
    ).toBe(false);
  });
});
