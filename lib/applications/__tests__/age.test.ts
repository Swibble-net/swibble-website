import { describe, expect, it } from "vitest";
import { calculateAge, parseIsoDate, todayInBerlin, toIsoDate } from "../age";

const d = (year: number, month: number, day: number) => ({ year, month, day });

describe("parseIsoDate", () => {
  it("parses valid dates", () => {
    expect(parseIsoDate("2008-09-19")).toEqual(d(2008, 9, 19));
    expect(parseIsoDate("2008-02-29")).toEqual(d(2008, 2, 29));
  });

  it("rejects malformed or non-existent dates", () => {
    for (const value of [
      "",
      "19.09.2008",
      "2008-9-19",
      "2008-13-01",
      "2008-00-10",
      "2023-02-29",
      "2008-04-31",
      "2008-09-19T00:00:00Z",
      null,
      20080919,
    ]) {
      expect(parseIsoDate(value)).toBeNull();
    }
  });

  it("round-trips through toIsoDate", () => {
    expect(toIsoDate(d(2008, 2, 9))).toBe("2008-02-09");
  });
});

describe("calculateAge around the 18th birthday", () => {
  const birth = d(2008, 9, 19);

  it("is 17 the day before the birthday", () => {
    expect(calculateAge(birth, d(2026, 9, 18))).toBe(17);
  });

  it("is 18 on the birthday itself", () => {
    expect(calculateAge(birth, d(2026, 9, 19))).toBe(18);
  });

  it("is 18 the day after", () => {
    expect(calculateAge(birth, d(2026, 9, 20))).toBe(18);
  });

  it("handles month and year boundaries", () => {
    expect(calculateAge(d(2008, 10, 1), d(2026, 9, 30))).toBe(17);
    expect(calculateAge(d(2008, 10, 1), d(2026, 10, 1))).toBe(18);
    expect(calculateAge(d(2008, 12, 31), d(2026, 1, 1))).toBe(17);
  });

  it("treats 29 February birthdays as 1 March in non-leap years", () => {
    const leapling = d(2008, 2, 29);
    expect(calculateAge(leapling, d(2026, 2, 28))).toBe(17);
    expect(calculateAge(leapling, d(2026, 3, 1))).toBe(18);
    // In a leap year the birthday is 29 February itself.
    expect(calculateAge(leapling, d(2028, 2, 28))).toBe(19);
    expect(calculateAge(leapling, d(2028, 2, 29))).toBe(20);
  });

  it("is negative for birth dates in the future", () => {
    expect(calculateAge(d(2027, 1, 1), d(2026, 9, 19))).toBeLessThan(0);
  });
});

describe("todayInBerlin", () => {
  it("uses the German calendar day, not UTC", () => {
    // 22:30 UTC on 18 Sep is already 00:30 on 19 Sep in Berlin (CEST).
    expect(todayInBerlin(new Date("2026-09-18T22:30:00Z"))).toEqual(
      d(2026, 9, 19),
    );
    // Winter time: 23:30 UTC is 00:30 the next day (CET).
    expect(todayInBerlin(new Date("2026-12-31T23:30:00Z"))).toEqual(
      d(2027, 1, 1),
    );
    expect(todayInBerlin(new Date("2026-09-18T12:00:00Z"))).toEqual(
      d(2026, 9, 18),
    );
  });
});
