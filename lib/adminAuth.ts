import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { GetServerSidePropsContext } from "next";

/**
 * Lightweight, project-agnostic admin auth for the CMS.
 *
 * The admin logs in with a shared password (ADMIN_PASSWORD). On success we set
 * an HTTP-only, signed cookie. The signature is an HMAC over the payload using
 * ADMIN_SESSION_SECRET, so the cookie can't be forged client-side. This is
 * deliberately independent of Firebase Auth so switching Firebase projects
 * never affects who can log in.
 */

export const ADMIN_COOKIE = "swibble_admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "insecure-dev-secret-change-me"
  );
}

/** Timing-safe string comparison. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Validates a submitted password against ADMIN_PASSWORD. */
export function isValidPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

/** Builds a signed session token that expires after SESSION_MAX_AGE_SECONDS. */
export function createSessionToken(): string {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ expires })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;

  try {
    const { expires } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { expires: number };
    return typeof expires === "number" && expires > Date.now();
  } catch {
    return false;
  }
}

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** True when the incoming request carries a valid admin session cookie. */
export function isAuthenticated(
  req: NextApiRequest | GetServerSidePropsContext["req"],
): boolean {
  const token = readCookie(req.headers.cookie, ADMIN_COOKIE);
  return isValidToken(token);
}

export function setSessionCookie(res: NextApiResponse): void {
  const token = createSessionToken();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`,
  );
}

export function clearSessionCookie(res: NextApiResponse): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  );
}

/**
 * Guards an API route. Returns true if the request is authenticated; otherwise
 * writes a 401 response and returns false.
 */
export function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): boolean {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ message: "Unauthorized" });
  return false;
}
