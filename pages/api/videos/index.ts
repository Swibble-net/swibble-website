import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { createVideo, getAllVideos } from "@/lib/videos/videos";
import type { VideoInput } from "@/lib/videos/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "GET") {
      const videos = await getAllVideos();
      return res.status(200).json({ videos });
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;

      const body = req.body as Partial<VideoInput>;
      if (!body?.url?.trim()) {
        return res.status(400).json({ message: "Video-URL ist erforderlich." });
      }

      const video = await createVideo({
        url: body.url,
        title: body.title,
      });

      return res.status(201).json({ video });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/videos]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
