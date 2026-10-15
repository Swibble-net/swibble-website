import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  CONSENT_VERSION,
  CONTACT_CONSENT_TEXT,
  CREATOR_CONSENT_VERSION,
  CREATOR_PHOTO_MIN_COUNT,
  CREATOR_RELEASE_CLAUSES,
  GUARDIAN_CONFIRM_TEXT,
  GUARDIAN_ONLINE_ACCEPT_TEXT,
  MEDIA_CONSENT_TEXT,
  PHOTO_MAX_COUNT,
  PRIVACY_ACK_TEXT,
  creatorReleaseText,
  guardianDeclarationText,
} from "@/lib/applications/config";
import { applicationsToCsv } from "@/lib/applications/csv";
import {
  parseConsentFile,
  parsePhoto,
  parseReleaseDocument,
  parseSetcard,
} from "@/lib/applications/fileType";
import { sendApplicationMails } from "@/lib/applications/notify";
import { createRateLimiter } from "@/lib/applications/rateLimit";
import { getApplicationSettings } from "@/lib/applications/settings";
import {
  createApplication,
  getCenterOptions,
  isApplicationStoreAvailable,
  isConsentUploadAvailable,
  listApplications,
  type ConsentUpload,
} from "@/lib/applications/store";
import type { ApplicationErrors } from "@/lib/applications/types";
import {
  validateApplication,
  validateCreatorApplication,
} from "@/lib/applications/validation";
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

const CHECK_FIELDS = "Bitte prüfe die markierten Felder.";

type Body = Record<string, unknown>;

class FieldErrors extends Error {
  constructor(readonly errors: ApplicationErrors) {
    super("invalid fields");
  }
}

/** Decodes the photos of an application (all-or-nothing). */
function parsePhotos(body: Body): ConsentUpload[] {
  const rawPhotos = Array.isArray(body.photos) ? body.photos : [];
  if (rawPhotos.length > PHOTO_MAX_COUNT) {
    throw new FieldErrors({
      photos: `Bitte lade höchstens ${PHOTO_MAX_COUNT} Fotos hoch.`,
    });
  }
  return rawPhotos.map((raw) => {
    const photo = parsePhoto((raw as { data?: unknown } | null)?.data);
    if (!photo.ok) throw new FieldErrors({ photos: photo.error });
    return { buffer: photo.buffer, type: photo.type };
  });
}

function fileData(value: unknown): unknown {
  return (value as { data?: unknown } | null | undefined)?.data;
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const ip = clientIp(req);
  if (!limiter.allow(ip)) {
    return res.status(429).json({
      message:
        "Zu viele Versuche. Bitte warte ein paar Minuten und probier es dann noch einmal.",
    });
  }

  const body: Body =
    req.body && typeof req.body === "object"
      ? (req.body as Body)
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

  try {
    if (body.pool === "creator") return await handleCreator(body, res);
    return await handleVideos(body, res);
  } catch (error) {
    if (!(error instanceof FieldErrors)) throw error;
    return res.status(400).json({ message: CHECK_FIELDS, errors: error.errors });
  }
}

/** /bewerben: videos in the centers, minors with parental consent. */
async function handleVideos(body: Body, res: NextApiResponse) {
  const { enabledRoles } = await getApplicationSettings();
  const result = validateApplication(body, new Date(), enabledRoles);
  if (!result.ok) throw new FieldErrors(result.errors);

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
    const file = parseConsentFile(fileData(body.consentFile));
    if (!file.ok) throw new FieldErrors({ consentFile: file.error });
    upload = { buffer: file.buffer, type: file.type };
  }

  // Optional photos of the applicant.
  const photos = parsePhotos(body);

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
  const { guardian } = result.value;
  const application = await createApplication(
    {
      ...result.value,
      pool: "videos",
      center,
      centerName,
      isMinor: result.isMinor,
      ageAtSubmission: result.age,
      consent: {
        contactText: CONTACT_CONSENT_TEXT,
        privacyText: PRIVACY_ACK_TEXT,
        mediaText: MEDIA_CONSENT_TEXT,
        guardianText: !guardian
          ? ""
          : guardian.method === "signature"
            ? GUARDIAN_ONLINE_ACCEPT_TEXT
            : GUARDIAN_CONFIRM_TEXT,
        // Signed online: keep the exact wording that was signed.
        guardianDeclaration:
          guardian?.method === "signature"
            ? guardianDeclarationText(result.value.roles)
            : "",
        creatorRelease: "",
        version: CONSENT_VERSION,
        givenAt: now,
      },
      consentFile: null,
      releaseFile: null,
      setcardFile: null,
      photos: [],
      status: "neu",
      note: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      consent: upload,
      release: null,
      setcard: null,
      // Without the private bucket the photos are dropped; they are optional
      // and the form doesn't offer the field in that case.
      photos: isConsentUploadAvailable() ? photos : [],
    },
  );

  await sendApplicationMails(application);

  return res.status(201).json({ success: true });
}

/**
 * /bewerben/creator: Swibble Creator Pool. Adults only; photos and the release
 * signed online are mandatory, setcard and portfolio link optional.
 */
async function handleCreator(body: Body, res: NextApiResponse) {
  const result = validateCreatorApplication(body, new Date());
  if (!result.ok) throw new FieldErrors(result.errors);

  const photos = parsePhotos(body);
  if (photos.length < CREATOR_PHOTO_MIN_COUNT) {
    throw new FieldErrors({ photos: "Bitte lade mindestens ein Foto von dir hoch." });
  }

  const release = parseReleaseDocument(fileData(body.releaseFile));
  if (!release.ok) throw new FieldErrors({ signature: release.error });

  let setcard: ConsentUpload | null = null;
  if (body.setcardFile !== undefined && body.setcardFile !== null) {
    const file = parseSetcard(fileData(body.setcardFile));
    if (!file.ok) throw new FieldErrors({ setcard: file.error });
    setcard = { buffer: file.buffer, type: file.type };
  }

  if (!isApplicationStoreAvailable() || !isConsentUploadAvailable()) {
    // Photos and the signed release are the point of this application.
    return res.status(503).json({ message: UNAVAILABLE_MESSAGE });
  }

  const now = Date.now();
  const { firstName, lastName, roles } = result.value;
  const application = await createApplication(
    {
      ...result.value,
      pool: "creator",
      centerName: "",
      isMinor: false,
      ageAtSubmission: result.age,
      consent: {
        // The storage/contact clause of the signed release.
        contactText: CREATOR_RELEASE_CLAUSES[4],
        privacyText: PRIVACY_ACK_TEXT,
        mediaText: "",
        guardianText: "",
        guardianDeclaration: "",
        // Exact wording that was signed, with name and roles filled in.
        creatorRelease: creatorReleaseText(`${firstName} ${lastName}`, roles),
        version: CREATOR_CONSENT_VERSION,
        givenAt: now,
      },
      consentFile: null,
      releaseFile: null,
      setcardFile: null,
      photos: [],
      status: "neu",
      note: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      consent: null,
      release: { buffer: release.buffer, type: release.type },
      setcard,
      photos,
    },
  );

  await sendApplicationMails(application);

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
