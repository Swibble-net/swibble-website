// Gender, height, nationality and languages of a creator ("Steckbrief"):
// asked in the creator pool application, taken over to the creator page and
// shown there.
// Pure: shared by the forms, the API routes and the pages.

import { PHONE_COUNTRIES } from "./phone";

export const GENDERS = [
  { id: "female", label: "Weiblich" },
  { id: "male", label: "Männlich" },
  { id: "diverse", label: "Divers" },
] as const;

export type Gender = (typeof GENDERS)[number]["id"];

/** Whole centimetres; children can apply too. */
export const HEIGHT_MIN_CM = 50;
export const HEIGHT_MAX_CM = 230;

/** Dual citizenship is common: up to two. */
export const NATIONALITIES_MAX = 2;

/** Shown once more above the A–Z list. */
export const PINNED_NATIONALITIES = ["DE"] as const;

/** Selectable languages, A–Z by German name (pre-sorted: same order on server and client). */
export const LANGUAGES: ReadonlyArray<{ id: string; label: string }> = [
  { id: "sq", label: "Albanisch" },
  { id: "ar", label: "Arabisch" },
  { id: "hy", label: "Armenisch" },
  { id: "az", label: "Aserbaidschanisch" },
  { id: "bs", label: "Bosnisch" },
  { id: "bg", label: "Bulgarisch" },
  { id: "zh", label: "Chinesisch" },
  { id: "da", label: "Dänisch" },
  { id: "de", label: "Deutsch" },
  { id: "gsg", label: "Deutsche Gebärdensprache" },
  { id: "en", label: "Englisch" },
  { id: "et", label: "Estnisch" },
  { id: "fi", label: "Finnisch" },
  { id: "fr", label: "Französisch" },
  { id: "ka", label: "Georgisch" },
  { id: "el", label: "Griechisch" },
  { id: "he", label: "Hebräisch" },
  { id: "hi", label: "Hindi" },
  { id: "id", label: "Indonesisch" },
  { id: "it", label: "Italienisch" },
  { id: "ja", label: "Japanisch" },
  { id: "ko", label: "Koreanisch" },
  { id: "hr", label: "Kroatisch" },
  { id: "ku", label: "Kurdisch" },
  { id: "lv", label: "Lettisch" },
  { id: "lt", label: "Litauisch" },
  { id: "lb", label: "Luxemburgisch" },
  { id: "mk", label: "Mazedonisch" },
  { id: "nl", label: "Niederländisch" },
  { id: "no", label: "Norwegisch" },
  { id: "ps", label: "Paschtu" },
  { id: "fa", label: "Persisch" },
  { id: "pl", label: "Polnisch" },
  { id: "pt", label: "Portugiesisch" },
  { id: "ro", label: "Rumänisch" },
  { id: "ru", label: "Russisch" },
  { id: "sv", label: "Schwedisch" },
  { id: "sr", label: "Serbisch" },
  { id: "sk", label: "Slowakisch" },
  { id: "sl", label: "Slowenisch" },
  { id: "so", label: "Somali" },
  { id: "es", label: "Spanisch" },
  { id: "tl", label: "Tagalog" },
  { id: "ta", label: "Tamil" },
  { id: "th", label: "Thailändisch" },
  { id: "ti", label: "Tigrinya" },
  { id: "cs", label: "Tschechisch" },
  { id: "tr", label: "Türkisch" },
  { id: "uk", label: "Ukrainisch" },
  { id: "hu", label: "Ungarisch" },
  { id: "ur", label: "Urdu" },
  { id: "vi", label: "Vietnamesisch" },
];

/** Offered as buttons; the rest is in a "Weitere Sprache" list. */
export const POPULAR_LANGUAGES = ["de", "en", "tr", "ar", "ru", "pl", "uk", "fr", "es", "it"] as const;

export const LANGUAGES_MAX = 8;

export interface ProfileFacts {
  /** "" = not given (other pool, older documents) */
  gender: Gender | "";
  /** 0 = not given */
  heightCm: number;
  /** ISO 3166-1 alpha-2 codes, at most NATIONALITIES_MAX */
  nationalities: string[];
  /** LANGUAGES ids in the chosen order, at most LANGUAGES_MAX */
  languages: string[];
}

export const emptyProfileFacts = (): ProfileFacts => ({
  gender: "",
  heightCm: 0,
  nationalities: [],
  languages: [],
});

export const isGender = (value: unknown): value is Gender => GENDERS.some((g) => g.id === value);

export const genderLabel = (id: string): string => GENDERS.find((g) => g.id === id)?.label ?? "";

/** German name of a country, e.g. "DE" → "Deutschland"; "" when unknown. */
export const countryName = (code: string): string =>
  PHONE_COUNTRIES.find((c) => c.code === code)?.name ?? "";

export const languageLabel = (id: string): string => LANGUAGES.find((l) => l.id === id)?.label ?? "";

/** "172 cm"; "" when not given. */
export const formatHeight = (cm: number): string => (cm > 0 ? `${cm} cm` : "");

/** "Deutschland, Türkei"; "" when not given. */
export const formatNationalities = (codes: readonly string[]): string =>
  codes.map(countryName).filter(Boolean).join(", ");

/** "Deutsch, Englisch"; "" when not given. */
export const formatLanguages = (ids: readonly string[]): string =>
  ids.map(languageLabel).filter(Boolean).join(", ");

/** Fills defaults for stored documents; drops values that are no longer valid. */
export function profileFactsOf(data: Partial<Record<keyof ProfileFacts, unknown>>): ProfileFacts {
  const height = data.heightCm;
  return {
    gender: isGender(data.gender) ? data.gender : "",
    heightCm:
      typeof height === "number" && Number.isInteger(height) && height >= HEIGHT_MIN_CM && height <= HEIGHT_MAX_CM
        ? height
        : 0,
    nationalities: Array.isArray(data.nationalities)
      ? data.nationalities.filter((code): code is string => typeof code === "string" && Boolean(countryName(code)))
      : [],
    languages: Array.isArray(data.languages)
      ? data.languages.filter((id): id is string => typeof id === "string" && Boolean(languageLabel(id)))
      : [],
  };
}

export type ProfileFactErrors = Partial<Record<keyof ProfileFacts, "missing" | "invalid">>;

/** Trimmed, de-duplicated strings of a list ([] when it isn't one). */
function idList(value: unknown, normalise: (id: string) => string): string[] {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map((id) => (typeof id === "string" ? normalise(id.trim()) : "")).filter(Boolean))];
}

/**
 * Checks gender, height (cm, as number or digits), nationalities (country
 * codes) and languages. With `required` (application form) all of them must
 * be given; in the CMS empty values are fine. Given values must always be valid.
 */
export function validateProfileFacts(
  raw: Record<string, unknown>,
  required: boolean,
): { value: ProfileFacts; errors: ProfileFactErrors } {
  const errors: ProfileFactErrors = {};

  const gender = typeof raw.gender === "string" ? raw.gender : "";
  if (gender && !isGender(gender)) errors.gender = "invalid";
  else if (!gender && required) errors.gender = "missing";

  const heightText =
    typeof raw.heightCm === "number"
      ? String(raw.heightCm)
      : typeof raw.heightCm === "string"
        ? raw.heightCm.trim().replace(/\s*cm$/i, "")
        : "";
  const heightCm = /^\d{1,3}$/.test(heightText) ? Number(heightText) : NaN;
  if (heightText && !(heightCm >= HEIGHT_MIN_CM && heightCm <= HEIGHT_MAX_CM)) errors.heightCm = "invalid";
  else if (!heightText && required) errors.heightCm = "missing";

  const codes = idList(raw.nationalities, (code) => code.toUpperCase());
  if (codes.length > NATIONALITIES_MAX || codes.some((code) => !countryName(code))) {
    errors.nationalities = "invalid";
  } else if (codes.length === 0 && required) errors.nationalities = "missing";

  const languages = idList(raw.languages, (id) => id.toLowerCase());
  if (languages.length > LANGUAGES_MAX || languages.some((id) => !languageLabel(id))) {
    errors.languages = "invalid";
  } else if (languages.length === 0 && required) errors.languages = "missing";

  return {
    errors,
    value: {
      gender: isGender(gender) ? gender : "",
      heightCm: errors.heightCm || !heightText ? 0 : heightCm,
      nationalities: errors.nationalities ? [] : codes,
      languages: errors.languages ? [] : languages,
    },
  };
}
