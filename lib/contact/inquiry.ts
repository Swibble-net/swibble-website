// Server-side validation of the /api/send-mail body and the mail built from it.
// Pure functions (no I/O), so the rules are testable without SMTP.
import { MESSAGE_MAX_LENGTH } from "@/lib/cta";
import {
  BUDGETS,
  COMPANY_MAX_LENGTH,
  GOALS,
  LOCATION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NUMBER_MAX_LENGTH,
  SERVICES,
  TIMEFRAMES,
  isValidEmail,
  labelOf,
  type Budget,
  type Goal,
  type Option,
  type Service,
  type Timeframe,
} from "@/lib/contact/funnel";

export interface Inquiry {
  email: string;
  number: string;
  message: string;
  name: string;
  company: string;
  /** City or town, no full address. */
  location: string;
  services: Service[];
  goals: Goal[];
  budget: Budget | "";
  timeframe: Timeframe | "";
  /** Body of the former free-text form (email, message, number only). */
  legacy: boolean;
}

export type InquiryResult =
  | { ok: true; inquiry: Inquiry }
  | { ok: false; error: string };

const FUNNEL_FIELDS = ["services", "goals", "goal", "budget", "timeframe", "name", "company", "location"] as const;
const SUBJECT_MAX_LENGTH = 200;

/** Single line without control characters: safe for mail headers such as the subject. */
export function cleanLine(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const fail = (error: string): InquiryResult => ({ ok: false, error });

const isEmpty = (value: unknown) => value === undefined || value === null || value === "";

/** Optional one-line text field: "" when absent, null when the type or length is invalid. */
function optionalLine(value: unknown, maxLength: number): string | null {
  if (isEmpty(value)) return "";
  if (typeof value !== "string") return null;
  const line = cleanLine(value);
  return line.length <= maxLength ? line : null;
}

/** Optional single choice: "" when absent, null when the value is not whitelisted. */
function optionalChoice<T extends string>(value: unknown, options: readonly Option<T>[]): T | "" | null {
  if (isEmpty(value)) return "";
  const match = options.find((option) => option.value === value);
  return match ? match.value : null;
}

export function parseInquiry(body: unknown): InquiryResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("Bad request!");
  }
  const data = body as Record<string, unknown>;
  const legacy = FUNNEL_FIELDS.every((field) => data[field] === undefined);

  // The former form required a message, the funnel makes it optional.
  if (!data.email || (legacy && !data.message)) return fail("Bad request!");

  if (typeof data.email !== "string" || !isValidEmail(data.email.trim())) {
    return fail("Invalid email");
  }

  if (!isEmpty(data.message) && typeof data.message !== "string") {
    return fail("Message too long");
  }
  const rawMessage = typeof data.message === "string" ? data.message : "";
  if (rawMessage.length > MESSAGE_MAX_LENGTH) return fail("Message too long");

  const number = optionalLine(data.number, NUMBER_MAX_LENGTH);
  if (number === null) return fail("Invalid number");

  const name = optionalLine(data.name, NAME_MAX_LENGTH);
  if (name === null) return fail("Invalid name");

  const company = optionalLine(data.company, COMPANY_MAX_LENGTH);
  if (company === null) return fail("Invalid company");

  const location = optionalLine(data.location, LOCATION_MAX_LENGTH);
  if (location === null) return fail("Invalid location");

  let services: Service[] = [];
  if (!legacy) {
    const allowed = SERVICES.map((option) => option.value) as string[];
    if (
      !Array.isArray(data.services) ||
      data.services.length === 0 ||
      data.services.length > allowed.length ||
      !data.services.every((item) => typeof item === "string" && allowed.includes(item))
    ) {
      return fail("Invalid services");
    }
    // De-duplicated and in the order of SERVICES.
    services = SERVICES.map((option) => option.value).filter((value) =>
      (data.services as string[]).includes(value),
    );
  }

  // Multi-select `goals`; the single `goal` of earlier form versions is still accepted.
  let goals: Goal[] = [];
  if (!isEmpty(data.goals)) {
    const allowed = GOALS.map((option) => option.value) as string[];
    if (
      !Array.isArray(data.goals) ||
      data.goals.length > allowed.length ||
      !data.goals.every((item) => typeof item === "string" && allowed.includes(item))
    ) {
      return fail("Invalid goal");
    }
    goals = GOALS.map((option) => option.value).filter((value) => (data.goals as string[]).includes(value));
  } else {
    const goal = optionalChoice(data.goal, GOALS);
    if (goal === null) return fail("Invalid goal");
    if (goal) goals = [goal];
  }

  const budget = optionalChoice(data.budget, BUDGETS);
  if (budget === null) return fail("Invalid budget");

  const timeframe = optionalChoice(data.timeframe, TIMEFRAMES);
  if (timeframe === null) return fail("Invalid timeframe");

  return {
    ok: true,
    inquiry: {
      email: data.email.trim(),
      number,
      message: rawMessage.trim(),
      name,
      company,
      location,
      services,
      goals,
      budget,
      timeframe,
      legacy,
    },
  };
}

const orDash = (value: string) => value || "–";

export function buildSubject(inquiry: Inquiry): string {
  if (inquiry.legacy) {
    return cleanLine(`Message from ${inquiry.email}. ${inquiry.number}`).slice(0, SUBJECT_MAX_LENGTH);
  }

  const services = inquiry.services.map((service) => labelOf(SERVICES, service)).join(", ");
  const sender = [inquiry.name, inquiry.company && `(${inquiry.company})`].filter(Boolean).join(" ");
  const parts = [
    `Neue Anfrage: ${services}`,
    inquiry.budget && `Budget ${labelOf(BUDGETS, inquiry.budget)}`,
    sender || inquiry.email,
  ].filter(Boolean);

  return cleanLine(parts.join(" – ")).slice(0, SUBJECT_MAX_LENGTH);
}

export function buildText(inquiry: Inquiry): string {
  if (inquiry.legacy) return inquiry.message;

  return [
    "Neue Anfrage über das Formular auf swibble.net",
    "",
    "ANFRAGE",
    `Leistungen: ${inquiry.services.map((service) => labelOf(SERVICES, service)).join(", ")}`,
    `Ziele:      ${orDash(inquiry.goals.map((goal) => labelOf(GOALS, goal)).join(", "))}`,
    `Budget:     ${orDash(labelOf(BUDGETS, inquiry.budget))}`,
    `Start:      ${orDash(labelOf(TIMEFRAMES, inquiry.timeframe))}`,
    "",
    "KONTAKT",
    `Name:        ${orDash(inquiry.name)}`,
    `Unternehmen: ${orDash(inquiry.company)}`,
    `Ort:         ${orDash(inquiry.location)}`,
    `E-Mail:      ${inquiry.email}`,
    `Telefon:     ${orDash(inquiry.number)}`,
    "",
    "NACHRICHT",
    orDash(inquiry.message),
    "",
  ].join("\n");
}
