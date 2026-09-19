import { describe, expect, it } from "vitest";
import { adoptEarlyInput } from "../earlyInput";

describe("adoptEarlyInput", () => {
  const empty = { firstName: "", birthDay: "", birthYear: "", city: "" };

  it("adopts values typed before hydration", () => {
    const dom: Record<string, string> = { firstName: "Testina", city: "Teststadt" };
    expect(adoptEarlyInput(empty, (key) => dom[key] ?? "")).toEqual({
      ...empty,
      firstName: "Testina",
      city: "Teststadt",
    });
  });

  it("never overwrites existing state", () => {
    const state = { ...empty, firstName: "Aus-State" };
    expect(
      adoptEarlyInput(state, () => "Aus-DOM").firstName,
    ).toBe("Aus-State");
  });

  it("keeps only digits for birth date parts", () => {
    const dom: Record<string, string> = { birthDay: "1.", birthYear: "20a10" };
    const result = adoptEarlyInput(empty, (key) => dom[key] ?? "");
    expect(result.birthDay).toBe("1");
    expect(result.birthYear).toBe("2010");
  });

  it("returns an equal copy when the DOM is empty", () => {
    expect(adoptEarlyInput(empty, () => "")).toEqual(empty);
  });
});
