import { describe, expect, it } from "vitest";
import { applicationsToCsv, csvCell } from "../csv";
import { toApplication } from "../store";

describe("csvCell", () => {
  it("quotes cells and escapes quotes", () => {
    expect(csvCell('Test "Zitat"; mit Semikolon')).toBe(
      '"Test ""Zitat""; mit Semikolon"',
    );
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"https://evil.example\")")).toMatch(/^"'=/);
    expect(csvCell("+491512345678")).toBe("\"'+491512345678\"");
    expect(csvCell("@handle")).toBe("\"'@handle\"");
  });
});

describe("applicationsToCsv", () => {
  it("writes a header row and one row per application", () => {
    const csv = applicationsToCsv([
      toApplication("test-1", {
        firstName: "Testina",
        lastName: "Testperson",
        roles: ["video", "promoter"],
        status: "kontaktiert",
        createdAt: Date.UTC(2026, 8, 19),
      }),
    ]);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"Vorname";"Nachname"');
    expect(lines[1]).toContain('"Testina";"Testperson"');
    expect(lines[1]).toContain('"Im Video mitmachen, Promoter:in für Events"');
    expect(lines[1]).toContain('"Kontaktiert"');
  });
});

describe("toApplication", () => {
  it("fills defaults for partial documents", () => {
    const application = toApplication("x", { status: "unbekannt" as never });
    expect(application.status).toBe("neu");
    expect(application.socials.tiktok).toBe("");
    expect(application.guardian).toBeNull();
    expect(application.consentFile).toBeNull();
  });
});
