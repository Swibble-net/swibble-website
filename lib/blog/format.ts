/** Formats an epoch-millisecond timestamp as a German date (e.g. 27. Juni 2026). */
export function formatDate(ms: number): string {
  if (!ms) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(ms));
}

/** ISO date string (YYYY-MM-DD) for <time> elements and machine reading. */
export function toIsoDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}
