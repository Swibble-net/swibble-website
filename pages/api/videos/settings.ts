import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidateHome } from "@/lib/revalidateHome";
import { getVideoSettings, updateVideoSettings } from "@/lib/videos/videos";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ settings: await getVideoSettings() });
    }

    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      if (typeof req.body?.soundEnabled !== "boolean") {
        return res.status(400).json({ message: "Ungültige Einstellung." });
      }
      const settings = await updateVideoSettings({
        soundEnabled: req.body.soundEnabled,
      });
      await revalidateHome(res);
      return res.status(200).json({ settings });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/videos/settings]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
