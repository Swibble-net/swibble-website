/**
 * Merges values that are already in the DOM when React takes over (typed or
 * autofilled before hydration) into the form state. State wins where it is
 * already set; birth date parts are reduced to digits like in the change
 * handler.
 */
export function adoptEarlyInput<T extends Record<string, string>>(
  state: T,
  readDomValue: (key: keyof T & string) => string,
): T {
  const next = { ...state };
  for (const key of Object.keys(state) as Array<keyof T & string>) {
    if (state[key]) continue;
    let value = readDomValue(key);
    if (key.startsWith("birth")) value = value.replace(/\D/g, "");
    if (value) next[key] = value as T[typeof key];
  }
  return next;
}
