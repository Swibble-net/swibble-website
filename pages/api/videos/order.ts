import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidateHome } from "@/lib/revalidateHome";
import { reorderVideos } from "@/lib/videos/videos";

const MAX_IDS = 500;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;

      const ids: unknown = req.body?.ids;
      if (
        !Array.isArray(ids) ||
        ids.length > MAX_IDS ||
        !ids.every((id) => typeof id === "string" && id.length > 0)
      ) {
        return res.status(400).json({ message: "Ungültige Reihenfolge." });
      }

      const videos = await reorderVideos(ids as string[]);
      await revalidateHome(res);
      return res.status(200).json({ videos });
    }

    res.setHeader("Allow", "PUT");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/videos/order]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
