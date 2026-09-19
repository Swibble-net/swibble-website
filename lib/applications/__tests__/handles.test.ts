import { describe, expect, it } from "vitest";
import { isValidHandle, normalizeHandle, profileUrl } from "../handles";

describe("normalizeHandle", () => {
  it("strips leading @ and whitespace", () => {
    expect(normalizeHandle("tiktok", "@test.user")).toBe("test.user");
    expect(normalizeHandle("tiktok", "  @@test_user  ")).toBe("test_user");
    expect(normalizeHandle("instagram", "test.user")).toBe("test.user");
  });

  it("returns an empty string for empty or non-string input", () => {
    expect(normalizeHandle("tiktok", "")).toBe("");
    expect(normalizeHandle("tiktok", "   ")).toBe("");
    expect(normalizeHandle("tiktok", "@")).toBe("");
    expect(normalizeHandle("tiktok", undefined)).toBe("");
    expect(normalizeHandle("tiktok", 42)).toBe("");
  });

  it("extracts the handle from pasted profile URLs", () => {
    expect(
      normalizeHandle("tiktok", "https://www.tiktok.com/@test.user?lang=de"),
    ).toBe("test.user");
    expect(normalizeHandle("tiktok", "tiktok.com/@test.user/")).toBe(
      "test.user",
    );
    expect(
      normalizeHandle("instagram", "https://instagram.com/test_user/?hl=de"),
    ).toBe("test_user");
    expect(
      normalizeHandle("snapchat", "https://www.snapchat.com/add/testuser"),
    ).toBe("testuser");
    expect(normalizeHandle("youtube", "https://m.youtube.com/@testkanal")).toBe(
      "testkanal",
    );
  });

  it("does not turn URLs of other sites into a valid handle", () => {
    const handle = normalizeHandle("tiktok", "https://evil.example/@someone");
    expect(isValidHandle("tiktok", handle)).toBe(false);
  });
});

describe("isValidHandle", () => {
  it("accepts typical handles", () => {
    expect(isValidHandle("tiktok", "test.user_01")).toBe(true);
    expect(isValidHandle("instagram", "a")).toBe(true);
    expect(isValidHandle("snapchat", "test-user")).toBe(true);
    expect(isValidHandle("youtube", "Test-Kanal")).toBe(true);
  });

  it("rejects spaces, markup and over-long handles", () => {
    expect(isValidHandle("tiktok", "test user")).toBe(false);
    expect(isValidHandle("tiktok", "<script>")).toBe(false);
    expect(isValidHandle("tiktok", "a".repeat(25))).toBe(false);
    expect(isValidHandle("instagram", "a".repeat(31))).toBe(false);
    expect(isValidHandle("snapchat", "1abc")).toBe(false);
    expect(isValidHandle("tiktok", "")).toBe(false);
  });
});

describe("profileUrl", () => {
  it("builds the public profile URL per platform", () => {
    expect(profileUrl("tiktok", "test.user")).toBe(
      "https://www.tiktok.com/@test.user",
    );
    expect(profileUrl("instagram", "test.user")).toBe(
      "https://www.instagram.com/test.user/",
    );
    expect(profileUrl("snapchat", "testuser")).toBe(
      "https://www.snapchat.com/add/testuser",
    );
    expect(profileUrl("youtube", "testkanal")).toBe(
      "https://www.youtube.com/@testkanal",
    );
  });
});
