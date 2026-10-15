// Step logic shared by both application forms (/bewerben, /bewerben/creator).
// Pure functions: the forms validate the whole payload with the server's
// rules and use these helpers to decide which step a message belongs to.

import type { ApplicationErrors } from "./types";

export interface StepDefinition<T extends string> {
  id: T;
  /** Error keys (field names) shown on this step */
  fields: readonly string[];
}

/** The messages of `errors` that belong to the given step. */
export function errorsForStep<T extends string>(
  step: StepDefinition<T>,
  errors: ApplicationErrors,
): ApplicationErrors {
  const found: ApplicationErrors = {};
  for (const key of step.fields) {
    if (errors[key]) found[key] = errors[key];
  }
  return found;
}

/**
 * The first step (in order) with a message, or — for keys no step shows —
 * the last step, so nothing is silently swallowed. null when error-free.
 */
export function firstStepWithErrors<T extends string>(
  steps: readonly StepDefinition<T>[],
  errors: ApplicationErrors,
): T | null {
  const keys = Object.keys(errors);
  if (keys.length === 0 || steps.length === 0) return null;
  const match = steps.find((step) => keys.some((key) => step.fields.includes(key)));
  return (match ?? steps[steps.length - 1]).id;
}

/** "Schritt 2 von 6" and the matching progress in percent (never 0). */
export function stepProgress(index: number, total: number) {
  const position = Math.min(Math.max(index, 0), Math.max(total - 1, 0)) + 1;
  return {
    position,
    total,
    percent: total > 0 ? Math.round((position / total) * 100) : 0,
  };
}
