import type { NextApiRequest, NextApiResponse } from "next";
import {
  CREATOR_PHOTO_MAX_BYTES,
  RELEASE_FILE_MAX_BYTES,
  SETCARD_MAX_BYTES,
  UPLOAD_CHUNK_BYTES,
} from "@/lib/applications/config";
import { detectConsentFileType } from "@/lib/applications/fileType";
import { sendApplicationMails } from "@/lib/applications/notify";
import {
  completeApplicationUpload,
  deleteApplication,
  getApplication,
  saveApplicationUpload,
  type UploadSlot,
} from "@/lib/applications/store";
import { isValidUploadToken } from "@/lib/applications/uploadToken";
import { BodyTooLargeError, readRawBody } from "@/lib/pitchdecks/readBody";

// Raw binary bodies: base64 in JSON would eat a third of the 4.5 MB limit.
export const config = { api: { bodyParser: false } };

const COVER_MAX_BYTES = 1024 * 1024;

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/**
 * Files of a creator pool application, after it was stored. Every request
 * carries the one-time token from POST /api/applications.
 *
 * PUT ?kind=photo&index=<n>              photo (JPEG)
 * PUT ?kind=release | consent            signed documents (JPEG)
 * PUT ?kind=setcard                      PDF, JPEG or PNG
 * PUT ?kind=video&index=<n>&chunk=<c>    4 MB piece of a video
 * PUT ?kind=videoCover&index=<n>         cover frame (JPEG)
 * POST ?action=complete                  checks everything, sends the mails
 * POST ?action=abort                     removes the application again
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  const { id, token, kind, action } = req.query;
  if (typeof id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    const application = await getApplication(id);
    if (!application || !isValidUploadToken(application.pendingUpload, token)) {
      return res.status(403).json({
        message: "Der Upload ist abgelaufen. Bitte schick die Bewerbung noch einmal ab.",
      });
    }
    const pending = application.pendingUpload!;

    if (req.method === "POST" && action === "abort") {
      await deleteApplication(id);
      return res.status(200).json({ success: true });
    }

    if (req.method === "POST" && action === "complete") {
      const result = await completeApplicationUpload(application);
      if (!result.ok) return res.status(400).json({ message: result.message });
      await sendApplicationMails(result.application);
      return res.status(200).json({ success: true });
    }

    if (req.method !== "PUT") {
      res.setHeader("Allow", "PUT, POST");
      return res.status(405).json({ message: "Method not allowed" });
    }

    const index = Number(req.query.index);
    const bad = (message = "Ungültiger Upload.") => res.status(400).json({ message });
    let slot: UploadSlot;
    let maxBytes: number;

    switch (kind) {
      case "photo":
        if (!Number.isInteger(index) || index < 0 || index >= pending.photos) return bad();
        slot = { kind: "photo", index };
        maxBytes = CREATOR_PHOTO_MAX_BYTES;
        break;
      case "release":
        slot = { kind: "release" };
        maxBytes = RELEASE_FILE_MAX_BYTES;
        break;
      case "consent":
        if (!pending.consent) return bad();
        slot = { kind: "consent" };
        maxBytes = RELEASE_FILE_MAX_BYTES;
        break;
      case "setcard":
        if (!pending.setcard) return bad();
        slot = { kind: "setcard", extension: "" };
        maxBytes = SETCARD_MAX_BYTES;
        break;
      case "video": {
        const video = pending.videos[index];
        const chunk = Number(req.query.chunk);
        const chunks = video ? Math.max(1, Math.ceil(video.size / UPLOAD_CHUNK_BYTES)) : 0;
        if (!video || !Number.isInteger(chunk) || chunk < 0 || chunk >= chunks) return bad();
        slot = { kind: "videoChunk", index, chunk };
        maxBytes = UPLOAD_CHUNK_BYTES;
        break;
      }
      case "videoCover":
        if (!pending.videos[index]) return bad();
        slot = { kind: "videoCover", index };
        maxBytes = COVER_MAX_BYTES;
        break;
      default:
        return bad();
    }

    const buffer = await readRawBody(req, maxBytes);
    if (buffer.length === 0) return bad("Die Datei ist leer.");

    let contentType = "image/jpeg";
    if (slot.kind === "videoChunk") {
      const video = pending.videos[slot.index];
      const chunks = Math.max(1, Math.ceil(video.size / UPLOAD_CHUNK_BYTES));
      const expected =
        slot.chunk < chunks - 1 ? UPLOAD_CHUNK_BYTES : video.size - UPLOAD_CHUNK_BYTES * (chunks - 1);
      if (buffer.length !== expected) return bad("Ein Teil des Videos hat die falsche Größe.");
      contentType = "application/octet-stream";
    } else if (slot.kind === "setcard") {
      const type = detectConsentFileType(buffer);
      if (!type || type.mime === "image/heic") {
        return bad("Bitte lade die Setcard als PDF oder Bild (JPG, PNG) hoch.");
      }
      slot = { kind: "setcard", extension: type.extension };
      contentType = type.mime;
    } else if (!isJpeg(buffer)) {
      return bad("Die Datei konnte nicht gelesen werden.");
    }

    await saveApplicationUpload(id, slot, buffer, contentType);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return res.status(413).json({ message: "Die Datei ist zu groß." });
    }
    // Error class only — no personal data in logs.
    console.error("[/api/applications/:id/upload]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Upload fehlgeschlagen. Bitte versuch es noch einmal." });
  }
}
