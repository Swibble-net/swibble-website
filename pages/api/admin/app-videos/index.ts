import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidateHome } from "@/lib/revalidateHome";
import {
  AppVideoError,
  listAppVideos,
  publishAppVideo,
} from "@/lib/videos/appVideos";
import { createAppVideo } from "@/lib/videos/videos";

/** GET: finished videos from the Swibble app · POST: publish one to the carousel */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  try {
    if (req.method === "GET") {
      const page = typeof req.query.page === "string" ? req.query.page : "1";
      const q = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
      return res.status(200).json(await listAppVideos({ page, q }));
    }

    if (req.method === "POST") {
      const { assetId, fileId, title, accountName } = (req.body ?? {}) as Record<
        string,
        unknown
      >;
      if (typeof assetId !== "string" || typeof fileId !== "string") {
        return res.status(400).json({ message: "Ungültige Auswahl." });
      }
      const job = await publishAppVideo(assetId, fileId);
      const video = await createAppVideo(
        job,
        typeof title === "string" ? title : undefined,
        typeof accountName === "string" ? accountName : undefined,
      );
      await revalidateHome(res);
      return res.status(201).json({ video });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/admin/app-videos]", error);
    const status = error instanceof AppVideoError ? error.status : 500;
    return res.status(status).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
