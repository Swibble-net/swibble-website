export interface CalendarDate {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses YYYY-MM-DD and rejects dates that don't exist (e.g. 2023-02-30). */
export function parseIsoDate(value: unknown): CalendarDate | null {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function toIsoDate({ year, month, day }: CalendarDate): string {
  const pad = (n: number, length: number) => String(n).padStart(length, "0");
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * Today's calendar date in Germany. The server runs in UTC, so around
 * midnight a plain `new Date()` would be off by a day for German applicants.
 */
export function todayInBerlin(now: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Completed years of life on `today`. A birthday counts from the start of the
 * day (§ 187 Abs. 2 BGB); someone born on 29 February has their birthday on
 * 1 March in non-leap years. Negative when the birth date is in the future.
 */
export function calculateAge(birth: CalendarDate, today: CalendarDate): number {
  let age = today.year - birth.year;
  const hadBirthdayThisYear =
    today.month > birth.month ||
    (today.month === birth.month && today.day >= birth.day);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}
