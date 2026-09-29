import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  PAGE_IMAGE_MAX_BYTES,
  UPLOAD_CHUNK_BYTES,
  isJpeg,
  isPdf,
  isValidId,
  pdfChunkCount,
} from "@/lib/pitchdecks/config";
import { BodyTooLargeError, readRawBody } from "@/lib/pitchdecks/readBody";
import { getPitchDeck, savePage, savePdfChunk } from "@/lib/pitchdecks/store";

// Raw binary body: base64 in JSON would eat a third of the 4.5 MB request limit.
export const config = { api: { bodyParser: false } };

/**
 * PUT ?kind=page&index=<n>  one slide image (JPEG)
 * PUT ?kind=pdf&index=<n>   one chunk of the PDF (4 MB, the last one smaller)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id, kind } = req.query;
  const index = Number(req.query.index);
  if (!isValidId(id)) return res.status(400).json({ message: "Ungültige ID." });
  if ((kind !== "page" && kind !== "pdf") || !Number.isInteger(index) || index < 0) {
    return res.status(400).json({ message: "Ungültiger Upload." });
  }

  try {
    const deck = await getPitchDeck(id);
    if (!deck) return res.status(404).json({ message: "Präsentation nicht gefunden." });
    if (deck.status !== "uploading") {
      return res.status(409).json({ message: "Die Präsentation ist bereits abgeschlossen." });
    }

    if (kind === "page") {
      if (index >= deck.pages.length) return res.status(400).json({ message: "Ungültige Folie." });
      const buffer = await readRawBody(req, PAGE_IMAGE_MAX_BYTES);
      if (!isJpeg(buffer)) return res.status(400).json({ message: "Die Folie ist kein JPEG." });
      await savePage(deck, index, buffer);
    } else {
      const chunks = pdfChunkCount(deck.pdfSize);
      if (index >= chunks) return res.status(400).json({ message: "Ungültiger PDF-Teil." });
      const buffer = await readRawBody(req, UPLOAD_CHUNK_BYTES);
      const expected =
        index < chunks - 1 ? UPLOAD_CHUNK_BYTES : deck.pdfSize - UPLOAD_CHUNK_BYTES * (chunks - 1);
      if (buffer.length !== expected) {
        return res.status(400).json({ message: "Der PDF-Teil hat die falsche Größe." });
      }
      if (index === 0 && !isPdf(buffer)) {
        return res.status(400).json({ message: "Die Datei ist kein PDF." });
      }
      await savePdfChunk(deck, index, buffer);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return res.status(413).json({ message: "Die Datei ist zu groß." });
    }
    console.error("[/api/admin/pitchdecks/:id/upload]", error);
    return res.status(500).json({ message: "Upload fehlgeschlagen." });
  }
}
