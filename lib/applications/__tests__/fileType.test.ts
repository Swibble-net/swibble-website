import { describe, expect, it } from "vitest";
import { detectConsentFileType, parseConsentFile } from "../fileType";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const pad = (values: number[], length = 32) =>
  Uint8Array.from([...values, ...new Array(length - values.length).fill(0)]);

const PDF = pad(ascii("%PDF-1.7"));
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isoBmff = (brand: string) =>
  pad([0, 0, 0, 0x18, ...ascii("ftyp"), ...ascii(brand)]);

describe("detectConsentFileType", () => {
  it("recognises PDF, JPEG, PNG and HEIC by magic bytes", () => {
    expect(detectConsentFileType(PDF)?.extension).toBe("pdf");
    expect(detectConsentFileType(JPEG)?.mime).toBe("image/jpeg");
    expect(detectConsentFileType(PNG)?.mime).toBe("image/png");
    expect(detectConsentFileType(isoBmff("heic"))?.mime).toBe("image/heic");
    expect(detectConsentFileType(isoBmff("mif1"))?.extension).toBe("heic");
  });

  it("rejects everything else, whatever it claims to be", () => {
    expect(detectConsentFileType(pad(ascii("<html><script>")))).toBeNull();
    expect(detectConsentFileType(pad(ascii("<svg xmlns=")))).toBeNull();
    expect(detectConsentFileType(pad(ascii("GIF89a")))).toBeNull();
    expect(detectConsentFileType(pad([0x50, 0x4b, 0x03, 0x04]))).toBeNull(); // zip/docx
    expect(detectConsentFileType(pad(ascii("MZ")))).toBeNull(); // exe
    // MP4 video shares the ftyp container but not the HEIC brands.
    expect(detectConsentFileType(isoBmff("isom"))).toBeNull();
    expect(detectConsentFileType(isoBmff("mp42"))).toBeNull();
    expect(detectConsentFileType(new Uint8Array())).toBeNull();
    expect(detectConsentFileType(Uint8Array.from([0xff, 0xd8]))).toBeNull();
  });
});

describe("parseConsentFile", () => {
  const b64 = (data: Uint8Array) => Buffer.from(data).toString("base64");

  it("accepts a valid file and returns buffer + type", () => {
    const result = parseConsentFile(b64(PDF));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.type.mime).toBe("application/pdf");
      expect(result.buffer.length).toBe(PDF.length);
    }
  });

  it("requires a file", () => {
    expect(parseConsentFile(undefined).ok).toBe(false);
    expect(parseConsentFile("").ok).toBe(false);
    expect(parseConsentFile({ data: "x" }).ok).toBe(false);
  });

  it("rejects invalid base64 and unsupported types", () => {
    expect(parseConsentFile("not base64!!").ok).toBe(false);
    expect(parseConsentFile(b64(pad(ascii("<html>")))).ok).toBe(false);
  });

  it("enforces the size limit", () => {
    const atLimit = new Uint8Array(2048);
    atLimit.set(JPEG);
    expect(parseConsentFile(b64(atLimit), 2048).ok).toBe(true);

    const overLimit = new Uint8Array(2049);
    overLimit.set(JPEG);
    const result = parseConsentFile(b64(overLimit), 2048);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/zu groß/);
  });
});
