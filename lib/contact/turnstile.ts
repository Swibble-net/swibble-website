// Server-side check of the Turnstile token. The confirmation mail goes to an address
// the visitor typed in, so bots must not be able to trigger it at will.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TOKEN_MAX_LENGTH = 2048;

/** Active only when TURNSTILE_SECRET_KEY is set; without it the former behaviour applies. */
export const isTurnstileEnforced = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

export async function verifyTurnstile(token: unknown): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > TOKEN_MAX_LENGTH) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("[send-mail] turnstile", error);
    return false;
  }
}
