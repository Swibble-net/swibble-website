import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { AppVideoError, fetchAppVideoThumbnail } from "@/lib/videos/appVideos";

/** Streams a private Drive thumbnail to the signed-in admin only. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!requireAdmin(req, res)) return;
  const { assetId, fileId } = req.query;
  if (typeof assetId !== "string" || typeof fileId !== "string") {
    return res.status(400).json({ message: "Ungültige Auswahl." });
  }

  try {
    const image = await fetchAppVideoThumbnail(assetId, fileId);
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=600");
    return res.status(200).send(image.body);
  } catch (error) {
    const status = error instanceof AppVideoError ? error.status : 500;
    return res.status(status).json({ message: "Kein Vorschaubild." });
  }
}
