// Options and step logic of the multi-step inquiry form. Shared by the form
// (components/contact) and the server-side validation in /api/send-mail, so the
// whitelist of allowed values has exactly one source.

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const SERVICES = [
  { value: "social-media", label: "Social Media" },
  { value: "live-events", label: "Live-Events" },
  { value: "design", label: "Design" },
  { value: "software", label: "Software-Entwicklung" },
  { value: "unsure", label: "Noch unsicher" },
] as const satisfies readonly Option[];

export type Service = (typeof SERVICES)[number]["value"];

/** "Noch unsicher" excludes the concrete services and vice versa. */
export const UNSURE: Service = "unsure";

export const GOALS = [
  { value: "reach", label: "Mehr Reichweite", services: ["social-media"] },
  { value: "customers", label: "Mehr Kunden / Besucher", services: ["social-media", "live-events", "design", "software"] },
  { value: "event", label: "Event begleiten", services: ["live-events"] },
  { value: "website-app", label: "Neue Website / App", services: ["software", "design"] },
  { value: "branding", label: "Marke / Design auffrischen", services: ["design"] },
  { value: "other", label: "Etwas anderes", services: [] },
] as const satisfies readonly (Option & { services: readonly Service[] })[];

export type Goal = (typeof GOALS)[number]["value"];

export const BUDGETS = [
  { value: "under-2k", label: "unter 2.000 €" },
  { value: "2k-5k", label: "2.000 – 5.000 €" },
  { value: "5k-15k", label: "5.000 – 15.000 €" },
  { value: "over-15k", label: "über 15.000 €" },
  { value: "unknown", label: "Weiß ich noch nicht" },
] as const satisfies readonly Option[];

export type Budget = (typeof BUDGETS)[number]["value"];

export const TIMEFRAMES = [
  { value: "asap", label: "So schnell wie möglich" },
  { value: "1-3-months", label: "In 1–3 Monaten" },
  { value: "3-6-months", label: "In 3–6 Monaten" },
  { value: "open", label: "Noch offen" },
] as const satisfies readonly Option[];

export type Timeframe = (typeof TIMEFRAMES)[number]["value"];

// Field limits, enforced in the form (maxLength) and in /api/send-mail.
export const NAME_MAX_LENGTH = 100;
export const COMPANY_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;
export const NUMBER_MAX_LENGTH = 40;

// Deliberately loose: one @, no whitespace, a dot in the domain.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) =>
  email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email);

export const labelOf = (options: readonly Option[], value: string) =>
  options.find((option) => option.value === value)?.label ?? "";

// --- Step logic ---------------------------------------------------------------

/** Steps 1–3 collect data, 4 is the thank-you state. */
export const STEPS = [
  { step: 1, title: "Wobei brauchst du Hilfe?" },
  { step: 2, title: "Was ist dein Ziel?" },
  { step: 3, title: "Wie erreichen wir dich?" },
  { step: 4, title: "Danke für deine Anfrage!" },
] as const;

export type Step = (typeof STEPS)[number]["step"];

export const FIRST_STEP: Step = 1;
export const LAST_INPUT_STEP: Step = 3;
export const DONE_STEP: Step = 4;

export interface FunnelAnswers {
  services: Service[];
  goal: Goal | "";
  budget: Budget | "";
  timeframe: Timeframe | "";
}

export const EMPTY_ANSWERS: FunnelAnswers = {
  services: [],
  goal: "",
  budget: "",
  timeframe: "",
};

/** Toggles a service tile; "Noch unsicher" and the concrete services exclude each other. */
export function toggleService(selected: readonly Service[], service: Service): Service[] {
  if (selected.includes(service)) {
    return selected.filter((item) => item !== service);
  }
  if (service === UNSURE) return [UNSURE];
  const next = [...selected.filter((item) => item !== UNSURE), service];
  // Keep the order of SERVICES, independent of the click order.
  return SERVICES.map((option) => option.value).filter((value) => next.includes(value));
}

/** Goals that fit the chosen services; everything when the visitor is still unsure. */
export function goalsForServices(services: readonly Service[]) {
  const concrete = services.filter((service) => service !== UNSURE);
  if (!concrete.length) return [...GOALS];
  return GOALS.filter(
    (goal) =>
      goal.value === "other" ||
      goal.services.some((service) => concrete.includes(service)),
  );
}

/** Drops a goal that no longer fits after the services were changed. */
export function reconcileGoal(services: readonly Service[], goal: Goal | ""): Goal | "" {
  return goalsForServices(services).some((option) => option.value === goal) ? goal : "";
}

export function canProceed(step: Step, answers: FunnelAnswers): boolean {
  if (step === 1) return answers.services.length > 0;
  if (step === 2) return answers.goal !== "";
  return step === 3;
}

export function nextStep(step: Step, answers: FunnelAnswers): Step {
  if (step >= DONE_STEP || !canProceed(step, answers)) return step;
  return (step + 1) as Step;
}

/** No way back from the thank-you state: the inquiry is already sent. */
export function prevStep(step: Step): Step {
  if (step <= FIRST_STEP || step >= DONE_STEP) return step;
  return (step - 1) as Step;
}

/** Progress in percent for the progress bar; only the thank-you state is complete. */
export function progressPercent(step: Step): number {
  return Math.round((step / DONE_STEP) * 100);
}
