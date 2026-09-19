import { describe, expect, it } from "vitest";
import {
  EMPTY_ANSWERS,
  canProceed,
  goalsForServices,
  isValidEmail,
  nextStep,
  prevStep,
  progressPercent,
  reconcileGoals,
  toggleGoal,
  toggleService,
  type FunnelAnswers,
  type Step,
} from "@/lib/contact/funnel";

const answers = (patch: Partial<FunnelAnswers>): FunnelAnswers => ({ ...EMPTY_ANSWERS, ...patch });

describe("service selection", () => {
  it("allows multiple services and keeps the order of the tiles", () => {
    const selected = toggleService(toggleService([], "design"), "social-media");
    expect(selected).toEqual(["social-media", "design"]);
    expect(toggleService(selected, "design")).toEqual(["social-media"]);
  });

  it("makes 'Noch unsicher' and the concrete services exclude each other", () => {
    expect(toggleService(["social-media", "design"], "unsure")).toEqual(["unsure"]);
    expect(toggleService(["unsure"], "software")).toEqual(["software"]);
    expect(toggleService(["unsure"], "unsure")).toEqual([]);
  });
});

describe("goals", () => {
  it("offers only the goals that fit the services, plus 'Etwas anderes'", () => {
    expect(goalsForServices(["live-events"]).map((goal) => goal.value)).toEqual(["customers", "event", "other"]);
    expect(goalsForServices(["social-media", "software"]).map((goal) => goal.value)).toEqual([
      "reach",
      "customers",
      "website-app",
      "other",
    ]);
  });

  it("offers every goal while the visitor is unsure", () => {
    expect(goalsForServices(["unsure"])).toHaveLength(6);
    expect(goalsForServices([])).toHaveLength(6);
  });

  it("allows several goals and keeps the order of the chips", () => {
    const selected = toggleGoal(toggleGoal([], "branding"), "reach");
    expect(selected).toEqual(["reach", "branding"]);
    expect(toggleGoal(selected, "reach")).toEqual(["branding"]);
  });

  it("drops the goals that no longer fit the services", () => {
    expect(reconcileGoals(["social-media"], ["reach", "customers"])).toEqual(["reach", "customers"]);
    expect(reconcileGoals(["live-events"], ["reach", "customers"])).toEqual(["customers"]);
    expect(reconcileGoals(["live-events"], [])).toEqual([]);
  });
});

describe("step logic", () => {
  it("needs a service for step 1 and a goal for step 2", () => {
    expect(canProceed(1, answers({}))).toBe(false);
    expect(canProceed(1, answers({ services: ["unsure"] }))).toBe(true);
    expect(canProceed(2, answers({ services: ["design"] }))).toBe(false);
    // Budget and timeframe stay optional.
    expect(canProceed(2, answers({ services: ["design"], goals: ["branding"] }))).toBe(true);
  });

  it("only moves forward when the step is complete", () => {
    expect(nextStep(1, answers({}))).toBe(1);
    expect(nextStep(1, answers({ services: ["design"] }))).toBe(2);
    expect(nextStep(2, answers({ services: ["design"], goals: ["branding", "website-app"] }))).toBe(3);
    expect(nextStep(3, answers({}))).toBe(4);
    expect(nextStep(4, answers({}))).toBe(4);
  });

  it("goes back, but neither before step 1 nor out of the thank-you state", () => {
    expect(prevStep(3)).toBe(2);
    expect(prevStep(2)).toBe(1);
    expect(prevStep(1)).toBe(1);
    expect(prevStep(4)).toBe(4);
  });

  it("reports the progress in percent", () => {
    const steps: Step[] = [1, 2, 3, 4];
    expect(steps.map(progressPercent)).toEqual([25, 50, 75, 100]);
  });
});

describe("isValidEmail", () => {
  it("accepts plain addresses and rejects whitespace, line breaks and overlong input", () => {
    expect(isValidEmail("max@example.com")).toBe(true);
    expect(isValidEmail("max@example")).toBe(false);
    expect(isValidEmail("max @example.com")).toBe(false);
    expect(isValidEmail("max@example.com\r\nBcc: x@evil.example")).toBe(false);
    expect(isValidEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });
});
