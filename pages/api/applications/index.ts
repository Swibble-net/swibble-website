import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  CONSENT_VERSION,
  CONTACT_CONSENT_TEXT,
  PRIVACY_ACK_TEXT,
} from "@/lib/applications/config";
import { applicationsToCsv } from "@/lib/applications/csv";
import { parseConsentFile } from "@/lib/applications/fileType";
import { notifyNewApplication } from "@/lib/applications/notify";
import { createRateLimiter } from "@/lib/applications/rateLimit";
import {
  createApplication,
  getCenterOptions,
  isApplicationStoreAvailable,
  isConsentUploadAvailable,
  listApplications,
  type ConsentUpload,
} from "@/lib/applications/store";
import { validateApplication } from "@/lib/applications/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";

// The consent file arrives base64-encoded inside the JSON body. 4.5 MB is
// Vercel's hard limit for function requests; the file itself is capped lower
// (CONSENT_FILE_MAX_BYTES).
export const config = { api: { bodyParser: { sizeLimit: "4.5mb" } } };

const limiter = createRateLimiter(5, 10 * 60 * 1000);

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(",")[0]
    ?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

/** Logs the error class only — never request data (personal data of minors). */
function logError(scope: string, error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = (error as { code?: unknown })?.code;
  console.error(`[${scope}] ${name}${code ? ` (${String(code)})` : ""}`);
}

const UNAVAILABLE_MESSAGE =
  "Bewerbungen können gerade leider nicht gespeichert werden. Bitte versuch es später noch einmal oder schreib uns an info@swibble.net.";

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const ip = clientIp(req);
  if (!limiter.allow(ip)) {
    return res.status(429).json({
      message:
        "Zu viele Versuche. Bitte warte ein paar Minuten und probier es dann noch einmal.",
    });
  }

  const body =
    req.body && typeof req.body === "object"
      ? (req.body as Record<string, unknown>)
      : {};

  // Honeypot: real users never see or fill this field. Pretend success so
  // bots get no signal, but store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return res.status(200).json({ success: true });
  }

  // Bot check before any further work (validation, decoding the upload). The
  // form validates client-side first, so real users rarely lose a token here.
  if (!(await verifyTurnstileToken(body.turnstileToken, ip))) {
    return res.status(400).json({
      message: "Die Spam-Prüfung ist fehlgeschlagen. Bitte versuch es noch einmal.",
      errors: { turnstile: "Bitte bestätige die Spam-Prüfung noch einmal." },
    });
  }

  const result = validateApplication(body);
  if (!result.ok) {
    return res.status(400).json({
      message: "Bitte prüfe die markierten Felder.",
      errors: result.errors,
    });
  }

  // The center must be a known Linkhub profile; anything else is dropped
  // rather than rejected, the application itself is still valid.
  let centerName = "";
  let center = result.value.center;
  if (center) {
    const match = (await getCenterOptions()).find((c) => c.slug === center);
    centerName = match?.name ?? "";
    if (!match) center = "";
  }

  let upload: ConsentUpload | null = null;
  if (result.isMinor) {
    const file = parseConsentFile(
      (body.consentFile as { data?: unknown } | undefined)?.data,
    );
    if (!file.ok) {
      return res.status(400).json({
        message: "Bitte prüfe die markierten Felder.",
        errors: { consentFile: file.error },
      });
    }
    upload = { buffer: file.buffer, type: file.type };
  }

  if (!isApplicationStoreAvailable()) {
    return res.status(503).json({ message: UNAVAILABLE_MESSAGE });
  }
  if (upload && !isConsentUploadAvailable()) {
    // Never store a minor's application without the consent file.
    return res.status(503).json({
      message:
        "Der Upload der Einverständniserklärung ist gerade nicht möglich, deshalb konnten wir deine Bewerbung nicht speichern. Bitte versuch es später noch einmal oder schreib uns an info@swibble.net.",
    });
  }

  const now = Date.now();
  const application = await createApplication(
    {
      ...result.value,
      center,
      centerName,
      isMinor: result.isMinor,
      ageAtSubmission: result.age,
      consent: {
        contactText: CONTACT_CONSENT_TEXT,
        privacyText: PRIVACY_ACK_TEXT,
        version: CONSENT_VERSION,
        givenAt: now,
      },
      consentFile: null,
      status: "neu",
      note: "",
      createdAt: now,
      updatedAt: now,
    },
    upload,
  );

  await notifyNewApplication(application);

  return res.status(201).json({ success: true });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;

  const applications = await listApplications();
  res.setHeader("Cache-Control", "private, no-store");

  if (req.query.format === "csv") {
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bewerbungen-${date}.csv"`,
    );
    return res.status(200).send(applicationsToCsv(applications));
  }

  return res.status(200).json({ applications });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "POST") return await handlePost(req, res);
    if (req.method === "GET") return await handleGet(req, res);

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    logError("/api/applications", error);
    return res.status(500).json({
      message:
        "Da ist etwas schiefgelaufen. Deine Bewerbung wurde nicht gespeichert – bitte versuch es noch einmal.",
    });
  }
}
