import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidateHome } from "@/lib/revalidateHome";
import {
  deleteVideo,
  updateVideoAccountName,
  updateVideoCover,
} from "@/lib/videos/videos";
import { unpublishAppVideo } from "@/lib/videos/appVideos";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    if (req.method === "PATCH") {
      if (!requireAdmin(req, res)) return;

      const cover =
        typeof req.body?.cover === "string" ? req.body.cover : undefined;
      // `{ accountName }` edits the caption; anything else is a cover update.
      const video =
        typeof req.body?.accountName === "string"
          ? await updateVideoAccountName(id, req.body.accountName)
          : await updateVideoCover(id, cover);
      if (!video) return res.status(404).json({ message: "Nicht gefunden." });

      await revalidateHome(res);
      return res.status(200).json({ video });
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;

      const removed = await deleteVideo(id);
      if (!removed) return res.status(404).json({ message: "Nicht gefunden." });
      if (removed.source === "app" && removed.appJobId) {
        // Best effort: the carousel entry is gone either way; the Drive original is never touched.
        await unpublishAppVideo(removed.appJobId).catch((error) =>
          console.error(`[/api/videos/${id}] unpublish`, error),
        );
      }
      await revalidateHome(res);
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error(`[/api/videos/${id}]`, error);
    if (error instanceof Error && error.message.startsWith("Cover must be")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
