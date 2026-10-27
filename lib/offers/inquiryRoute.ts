import type { NextApiRequest, NextApiResponse } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { createRateLimiter } from "@/lib/applications/rateLimit";
import { publicName } from "@/lib/creators/config";
import { validateCreatorInquiry } from "@/lib/creators/inquiry";
import { clientIp } from "@/lib/creators/inquiryRoute";
import { isMailConfigured } from "@/lib/creators/notify";
import { getCreator } from "@/lib/creators/store";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { chosenItems } from "./config";
import { sendOfferInquiry } from "./notify";
import { addOfferRequest, getOfferByToken } from "./store";

const limiter = createRateLimiter(5, 10 * 60 * 1000);

const UNAVAILABLE =
  "Anfragen sind gerade leider nicht möglich. Schreib uns gern an info@swibble.net.";

/** POST handler for a choice from a web offer (/angebot/<token>). */
export async function handleOfferInquiry(req: NextApiRequest, res: NextApiResponse, token: string) {
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

    // A switched-off offer only answers the signed-in admin.
    const offer = await getOfferByToken(token);
    if (!offer || (!offer.active && !isAuthenticated(req))) {
      return res.status(404).json({ message: "Dieses Angebot gibt es nicht (mehr)." });
    }

    const chosen = chosenItems(offer, body.creatorIds);
    if (!chosen) return res.status(400).json({ message: "Bitte wähle mindestens einen Creator aus." });

    const result = validateCreatorInquiry(body, { messageRequired: false });
    if (!result.ok) {
      return res.status(400).json({ message: "Bitte prüfe die markierten Felder.", errors: result.errors });
    }

    if (!isMailConfigured()) return res.status(503).json({ message: UNAVAILABLE });
    const profiles = await Promise.all(chosen.map((item) => getCreator(item.creatorId)));
    const picked = chosen.map((item, index) => {
      const name = profiles[index]?.name ?? "Creator (gelöscht)";
      return { name, shownName: publicName(name), price: item.price };
    });
    const { confirmationSent } = await sendOfferInquiry(result.value, offer, picked);
    // The mail is what counts; the note in the CMS is a bonus.
    await addOfferRequest(
      offer.id,
      chosen.map((item) => item.creatorId),
    ).catch(() => undefined);
    return res.status(200).json({ success: true, confirmationSent });
  } catch (error) {
    console.error("[offer inquiry]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: UNAVAILABLE });
  }
}
