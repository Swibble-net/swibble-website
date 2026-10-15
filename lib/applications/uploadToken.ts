import crypto from "crypto";
import type { PendingUpload } from "./types";

/** Only the hash is stored; the token itself goes to the applicant's browser. */
export function hashUploadToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** True when `token` opens the pending upload (and it hasn't expired). */
export function isValidUploadToken(
  pending: PendingUpload | null,
  token: unknown,
  now: number = Date.now(),
): boolean {
  if (!pending || typeof token !== "string" || token.length < 16 || token.length > 128) {
    return false;
  }
  if (pending.expiresAt < now) return false;
  const given = Buffer.from(hashUploadToken(token), "hex");
  const expected = Buffer.from(pending.tokenHash, "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
