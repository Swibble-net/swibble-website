import { describe, expect, it } from "vitest";
import { errorsForStep, firstStepWithErrors, stepProgress } from "../steps";

const STEPS = [
  { id: "roles", fields: ["roles"] },
  { id: "person", fields: ["firstName", "birthDate"] },
  { id: "contact", fields: ["email", "phone"] },
  { id: "finish", fields: ["privacyAck", "turnstile"] },
] as const;

describe("errorsForStep", () => {
  it("keeps only the messages of the step's own fields", () => {
    expect(
      errorsForStep(STEPS[2], { email: "E", firstName: "F", phone: "P" }),
    ).toEqual({ email: "E", phone: "P" });
    expect(errorsForStep(STEPS[0], { email: "E" })).toEqual({});
  });
});

describe("firstStepWithErrors", () => {
  it("finds the earliest step with a message", () => {
    expect(firstStepWithErrors(STEPS, { phone: "P", birthDate: "B" })).toBe("person");
    expect(firstStepWithErrors(STEPS, { turnstile: "T" })).toBe("finish");
  });

  it("falls back to the last step for keys no step shows", () => {
    expect(firstStepWithErrors(STEPS, { somethingNew: "X" })).toBe("finish");
  });

  it("returns null without errors", () => {
    expect(firstStepWithErrors(STEPS, {})).toBeNull();
  });
});

describe("stepProgress", () => {
  it("counts from one and ends at 100 %", () => {
    expect(stepProgress(0, 4)).toEqual({ position: 1, total: 4, percent: 25 });
    expect(stepProgress(3, 4)).toEqual({ position: 4, total: 4, percent: 100 });
  });

  it("clamps out-of-range indices", () => {
    expect(stepProgress(-1, 4).position).toBe(1);
    expect(stepProgress(9, 4).position).toBe(4);
  });
});
