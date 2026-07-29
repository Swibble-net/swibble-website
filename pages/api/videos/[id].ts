import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { deleteVideo } from "@/lib/videos/videos";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;

      const ok = await deleteVideo(id);
      if (!ok) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error(`[/api/videos/${id}]`, error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
