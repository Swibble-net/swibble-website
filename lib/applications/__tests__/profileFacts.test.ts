import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  POPULAR_LANGUAGES,
  formatHeight,
  formatLanguages,
  formatNationalities,
  genderLabel,
  profileFactsOf,
} from "../profileFacts";

describe("profileFacts", () => {
  it("formats the Steckbrief for the page", () => {
    expect(genderLabel("female")).toBe("Weiblich");
    expect(formatHeight(172)).toBe("172 cm");
    expect(formatHeight(0)).toBe("");
    expect(formatNationalities(["DE", "RU"])).toBe("Deutschland, Russland");
    expect(formatLanguages(["de", "es", "en"])).toBe("Deutsch, Spanisch, Englisch");
  });

  it("fills defaults for older documents and drops unknown values", () => {
    expect(profileFactsOf({})).toEqual({ gender: "", heightCm: 0, nationalities: [], languages: [] });
    expect(
      profileFactsOf({ gender: "x", heightCm: 1.8, nationalities: ["DE", "XX"], languages: ["de", 3] }),
    ).toEqual({ gender: "", heightCm: 0, nationalities: ["DE"], languages: ["de"] });
  });

  it("keeps the language list sorted and the popular ones known", () => {
    const labels = LANGUAGES.map((l) => l.label);
    expect([...labels].sort((a, b) => a.localeCompare(b, "de"))).toEqual(labels);
    expect(new Set(LANGUAGES.map((l) => l.id)).size).toBe(LANGUAGES.length);
    for (const id of POPULAR_LANGUAGES) expect(LANGUAGES.some((l) => l.id === id)).toBe(true);
  });
});
