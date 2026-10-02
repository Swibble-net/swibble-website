import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getApplicationSettings,
  normalizeEnabledRoles,
  updateApplicationSettings,
} from "@/lib/applications/settings";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ settings: await getApplicationSettings() });
    }

    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const enabledRoles = normalizeEnabledRoles(req.body?.enabledRoles);
      if (!enabledRoles) {
        return res
          .status(400)
          .json({ message: "Mindestens eine Option muss aktiv bleiben." });
      }
      const settings = await updateApplicationSettings({ enabledRoles });
      return res.status(200).json({ settings });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/applications/settings]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Serverfehler",
    });
  }
}
