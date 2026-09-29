import { describe, expect, it } from "vitest";
import {
  PDF_MAX_BYTES,
  UPLOAD_CHUNK_BYTES,
  buildSlug,
  contentDisposition,
  downloadFileName,
  isPdf,
  isPreviewAgent,
  isValidSlug,
  pdfChunkCount,
  validateInput,
} from "../config";

const validBody = {
  customer: "Kaisergarten Aachen",
  title: "Social-Media-Konzept",
  pages: [{ width: 2000, height: 1125 }],
  pdfSize: 1000,
  originalSize: 5000,
  compressed: true,
};

describe("buildSlug", () => {
  it("combines the customer with an unguessable suffix", () => {
    const slug = buildSlug("Kaisergarten Aachen");
    expect(slug).toMatch(/^kaisergarten-aachen-[a-z2-9]{8}$/);
    expect(isValidSlug(slug)).toBe(true);
    expect(buildSlug("Kaisergarten Aachen")).not.toBe(slug);
  });

  it("falls back to the suffix alone and stays short", () => {
    expect(buildSlug("!!!")).toMatch(/^[a-z2-9]{8}$/);
    expect(isValidSlug(buildSlug("x".repeat(200)))).toBe(true);
  });
});

describe("isValidSlug", () => {
  it("rejects path tricks and wrong types", () => {
    expect(isValidSlug("../etc/passwd")).toBe(false);
    expect(isValidSlug("short")).toBe(false);
    expect(isValidSlug(["abc-defghijk"])).toBe(false);
  });
});

describe("pdfChunkCount", () => {
  it("splits into request-sized chunks", () => {
    expect(pdfChunkCount(1)).toBe(1);
    expect(pdfChunkCount(UPLOAD_CHUNK_BYTES)).toBe(1);
    expect(pdfChunkCount(UPLOAD_CHUNK_BYTES + 1)).toBe(2);
    expect(pdfChunkCount(PDF_MAX_BYTES)).toBe(32);
  });
});

describe("validateInput", () => {
  it("accepts a complete deck and trims text", () => {
    const result = validateInput({ ...validBody, customer: "  Kaisergarten Aachen " });
    expect(result).toMatchObject({ ok: true, input: { customer: "Kaisergarten Aachen", compressed: true } });
  });

  it("rejects missing fields, bad pages and oversize PDFs", () => {
    expect(validateInput({ ...validBody, customer: " " }).ok).toBe(false);
    expect(validateInput({ ...validBody, title: "" }).ok).toBe(false);
    expect(validateInput({ ...validBody, pages: [] }).ok).toBe(false);
    expect(validateInput({ ...validBody, pages: [{ width: 1.5, height: 2 }] }).ok).toBe(false);
    expect(validateInput({ ...validBody, pdfSize: PDF_MAX_BYTES + 1 }).ok).toBe(false);
    expect(validateInput(null).ok).toBe(false);
  });
});

describe("download names", () => {
  it("builds a readable file name without header-breaking characters", () => {
    expect(downloadFileName({ title: 'Konzept "2027"', customer: "A/B Center" })).toBe(
      "Konzept 2027 – A B Center.pdf",
    );
  });

  it("adds an ASCII fallback next to the UTF-8 name", () => {
    expect(contentDisposition("attachment", "Präsentation – Kö.pdf")).toBe(
      "attachment; filename=\"Prasentation - Ko.pdf\"; filename*=UTF-8''Pr%C3%A4sentation%20%E2%80%93%20K%C3%B6.pdf",
    );
  });
});

describe("isPreviewAgent", () => {
  it("skips link previews and bots but counts browsers", () => {
    expect(isPreviewAgent("WhatsApp/2.23.20.0")).toBe(true);
    expect(isPreviewAgent("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isPreviewAgent(undefined)).toBe(true);
    expect(
      isPreviewAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"),
    ).toBe(false);
  });
});

describe("isPdf", () => {
  it("checks the magic bytes", () => {
    expect(isPdf(Buffer.from("%PDF-1.7\n"))).toBe(true);
    expect(isPdf(Buffer.from("<html>"))).toBe(false);
  });
});
