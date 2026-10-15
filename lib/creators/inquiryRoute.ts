import type { NextApiRequest, NextApiResponse } from "next";
import { createRateLimiter } from "@/lib/applications/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { validateCreatorInquiry } from "./inquiry";
import { isMailConfigured, sendCreatorInquiry } from "./notify";
import { getCreatorBySlug } from "./store";

const limiter = createRateLimiter(5, 10 * 60 * 1000);

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

const UNAVAILABLE =
  "Anfragen sind gerade leider nicht möglich. Schreib uns gern an info@swibble.net.";

/**
 * POST handler for creator inquiries: for one published creator (slug) or a
 * general request from /creator (slug null).
 */
export async function handleCreatorInquiry(
  req: NextApiRequest,
  res: NextApiResponse,
  slug: string | null,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const ip = clientIp(req);
    if (!limiter.allow(ip)) {
      return res.status(429).json({ message: "Zu viele Anfragen. Bitte warte ein paar Minuten." });
    }

    const body =
      req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};

    // Honeypot: pretend success, send nothing.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return res.status(200).json({ success: true });
    }

    if (!(await verifyTurnstileToken(body.turnstileToken, ip))) {
      return res.status(400).json({
        message: "Die Spam-Prüfung ist fehlgeschlagen. Bitte versuch es noch einmal.",
        errors: { turnstile: "Bitte bestätige die Spam-Prüfung noch einmal." },
      });
    }

    const creator = slug === null ? null : await getCreatorBySlug(slug);
    if (slug !== null && (!creator || !creator.published)) {
      return res.status(404).json({ message: "Diesen Creator gibt es nicht (mehr)." });
    }

    const result = validateCreatorInquiry(body);
    if (!result.ok) {
      return res.status(400).json({ message: "Bitte prüfe die markierten Felder.", errors: result.errors });
    }

    if (!isMailConfigured()) return res.status(503).json({ message: UNAVAILABLE });
    const { confirmationSent } = await sendCreatorInquiry(result.value, creator);
    return res.status(200).json({ success: true, confirmationSent });
  } catch (error) {
    console.error("[creator inquiry]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: UNAVAILABLE });
  }
}
