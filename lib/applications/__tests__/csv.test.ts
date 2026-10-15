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
    expect(lines[1]).toContain('"Center-Videos"');
  });

  it("marks creator pool applications with their documents", () => {
    const csv = applicationsToCsv([
      toApplication("test-2", {
        pool: "creator",
        roles: ["creator"],
        portfolioUrl: "https://carla.example/",
        releaseFile: {
          path: "applications/releases/r.jpg",
          contentType: "image/jpeg",
          extension: "jpg",
          size: 1,
        },
      }),
    ]);
    const row = csv.trim().split("\r\n")[1];
    expect(row).toContain('"Creator Pool"');
    expect(row).toContain('"Content Creator"');
    expect(row).toContain('"https://carla.example/"');
    // Setcard missing, release signed
    expect(row).toContain('"nein";"ja"');
  });
});

describe("toApplication", () => {
  it("fills defaults for partial documents", () => {
    const application = toApplication("x", { status: "unbekannt" as never });
    expect(application.status).toBe("neu");
    expect(application.socials.tiktok).toBe("");
    expect(application.guardian).toBeNull();
    expect(application.consentFile).toBeNull();
    // Documents from before the creator pool belong to /bewerben.
    expect(application.pool).toBe("videos");
    expect(application.releaseFile).toBeNull();
    expect(application.setcardFile).toBeNull();
    expect(application.portfolioUrl).toBe("");
    expect(application.consent.creatorRelease).toBe("");
  });
});

describe("roleLabel", () => {
  it("uses the wording of the form the application came from", async () => {
    const { roleLabel } = await import("../config");
    expect(roleLabel("promoter")).toBe("Promoter:in für Events");
    expect(roleLabel("promoter", "creator")).toBe("Promoter:in");
    expect(roleLabel("moderation")).toBe("Moderation");
    expect(roleLabel("unbekannt")).toBe("unbekannt");
  });
});
