import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidateHome } from "@/lib/revalidateHome";
import { AppVideoError, getAppVideoJob } from "@/lib/videos/appVideos";
import { getVideo, updateAppVideo } from "@/lib/videos/videos";

/** Polled by the CMS while the Swibble app compresses a video. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");
  const { id } = req.query;
  if (typeof id !== "string" || !id) {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    const video = await getVideo(id);
    if (!video || video.source !== "app" || !video.appJobId) {
      return res.status(404).json({ message: "Nicht gefunden." });
    }
    if (video.status === "ready") return res.status(200).json({ video });

    const job = await getAppVideoJob(video.appJobId);
    const updated = await updateAppVideo(id, job);
    // The carousel only shows playable videos, so rebuild the home page once the job is done.
    if (updated?.status === "ready") await revalidateHome(res);
    return res.status(200).json({ video: updated });
  } catch (error) {
    console.error("[/api/admin/app-videos/status]", error);
    const status = error instanceof AppVideoError ? error.status : 500;
    return res.status(status).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
