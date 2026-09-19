const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when a Turnstile secret is present, i.e. tokens can be verified. */
export function isTurnstileEnforced(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verifies a Turnstile token with Cloudflare. Without TURNSTILE_SECRET_KEY the
 * check is skipped (returns true) so the form keeps working until the secret
 * is configured.
 */
export async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
