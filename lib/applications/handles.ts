export type SocialPlatform = "tiktok" | "instagram" | "snapchat" | "youtube";

interface PlatformRule {
  label: string;
  pattern: RegExp;
  /** Hosts whose profile URLs we accept instead of a bare handle */
  hosts: string[];
  profileUrl: (handle: string) => string;
}

export const SOCIAL_PLATFORMS: Record<SocialPlatform, PlatformRule> = {
  tiktok: {
    label: "TikTok",
    pattern: /^[A-Za-z0-9._]{2,24}$/,
    hosts: ["tiktok.com"],
    profileUrl: (h) => `https://www.tiktok.com/@${h}`,
  },
  instagram: {
    label: "Instagram",
    pattern: /^[A-Za-z0-9._]{1,30}$/,
    hosts: ["instagram.com"],
    profileUrl: (h) => `https://www.instagram.com/${h}/`,
  },
  snapchat: {
    label: "Snapchat",
    pattern: /^[A-Za-z][A-Za-z0-9._-]{2,14}$/,
    hosts: ["snapchat.com"],
    profileUrl: (h) => `https://www.snapchat.com/add/${h}`,
  },
  youtube: {
    label: "YouTube",
    pattern: /^[A-Za-z0-9._-]{3,30}$/,
    hosts: ["youtube.com"],
    profileUrl: (h) => `https://www.youtube.com/@${h}`,
  },
};

// Path segments that precede the handle in profile URLs (snapchat.com/add/…).
const URL_PREFIX_SEGMENTS = new Set(["add", "u"]);

function handleFromUrl(value: string, hosts: string[]): string | null {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (!hosts.includes(host)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const segment = segments.find((s) => !URL_PREFIX_SEGMENTS.has(s));
  return segment ?? null;
}

/**
 * Normalises user input to a bare handle: trims, accepts pasted profile URLs,
 * strips leading @ characters. Returns "" for empty input. The result is not
 * validated — use isValidHandle for that.
 */
export function normalizeHandle(
  platform: SocialPlatform,
  input: unknown,
): string {
  if (typeof input !== "string") return "";
  let value = input.trim();
  if (!value) return "";

  if (value.includes("/")) {
    value = handleFromUrl(value, SOCIAL_PLATFORMS[platform].hosts) ?? value;
  }

  return value.replace(/^@+/, "").trim();
}

export function isValidHandle(platform: SocialPlatform, handle: string): boolean {
  return SOCIAL_PLATFORMS[platform].pattern.test(handle);
}

export function profileUrl(platform: SocialPlatform, handle: string): string {
  return SOCIAL_PLATFORMS[platform].profileUrl(handle);
}
