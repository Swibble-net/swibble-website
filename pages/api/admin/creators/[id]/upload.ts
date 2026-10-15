import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  VIDEO_CHUNK_BYTES,
  VIDEO_COVER_MAX_BYTES,
  isValidId,
  videoChunkCount,
} from "@/lib/creators/config";
import {
  completeCreatorVideoUpload,
  getCreator,
  removeCreatorVideo,
  saveCreatorVideoChunk,
  saveCreatorVideoCover,
} from "@/lib/creators/store";
import { BodyTooLargeError, readRawBody } from "@/lib/pitchdecks/readBody";

// Raw binary body: base64 in JSON would eat a third of the 4.5 MB request limit.
export const config = { api: { bodyParser: false } };

/**
 * PUT ?video=<id>&index=<n>   one 4 MB piece of the video (the last one smaller)
 * PUT ?video=<id>&cover=1     cover image (JPEG)
 * POST ?video=<id>&complete=1 joins the pieces, the video goes live
 * POST ?video=<id>&abort=1    removes a failed upload
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  const { id, video: videoId } = req.query;
  if (!isValidId(id) || !isValidId(videoId)) {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    const profile = await getCreator(id);
    const video = profile?.videos.find((v) => v.id === videoId && v.source === "upload");
    if (!profile || !video) return res.status(404).json({ message: "Video nicht gefunden." });

    if (req.method === "POST" && req.query.abort === "1") {
      await removeCreatorVideo(profile, video.id);
      return res.status(200).json({ success: true });
    }

    if (req.method === "PUT" && req.query.cover === "1") {
      const buffer = await readRawBody(req, VIDEO_COVER_MAX_BYTES);
      if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        return res.status(400).json({ message: "Das Cover ist kein JPEG." });
      }
      await saveCreatorVideoCover(profile, video, buffer);
      return res.status(200).json({ success: true });
    }

    if (video.status !== "uploading") {
      return res.status(409).json({ message: "Das Video ist bereits hochgeladen." });
    }

    if (req.method === "PUT") {
      const index = Number(req.query.index);
      const chunks = videoChunkCount(video.size);
      if (!Number.isInteger(index) || index < 0 || index >= chunks) {
        return res.status(400).json({ message: "Ungültiger Teil." });
      }
      const buffer = await readRawBody(req, VIDEO_CHUNK_BYTES);
      const expected =
        index < chunks - 1 ? VIDEO_CHUNK_BYTES : video.size - VIDEO_CHUNK_BYTES * (chunks - 1);
      if (buffer.length !== expected) {
        return res.status(400).json({ message: "Der Teil hat die falsche Größe." });
      }
      await saveCreatorVideoChunk(profile, video, index, buffer);
      return res.status(200).json({ success: true });
    }

    if (req.method === "POST" && req.query.complete === "1") {
      const result = await completeCreatorVideoUpload(profile, video);
      if (!result.ok) return res.status(400).json({ message: result.message });
      return res.status(200).json({ creator: result.profile });
    }

    res.setHeader("Allow", "PUT, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return res.status(413).json({ message: "Die Datei ist zu groß." });
    }
    console.error("[/api/admin/creators/:id/upload]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Upload fehlgeschlagen." });
  }
}
