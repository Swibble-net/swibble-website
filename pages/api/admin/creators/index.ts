import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { getApplication } from "@/lib/applications/store";
import {
  createCreatorFromApplication,
  getCreatorForApplication,
  isCreatorStoreAvailable,
  listCreators,
} from "@/lib/creators/store";

/** GET: all creator pages · POST {applicationId}: page from an application */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  try {
    if (req.method === "GET") {
      return res.status(200).json({ creators: await listCreators() });
    }

    if (req.method === "POST") {
      if (!isCreatorStoreAvailable()) {
        return res.status(503).json({ message: "Speicher nicht konfiguriert (FIREBASE_STORAGE_BUCKET)." });
      }
      const { applicationId } = (req.body ?? {}) as { applicationId?: unknown };
      if (typeof applicationId !== "string" || !applicationId) {
        return res.status(400).json({ message: "Bewerbung fehlt." });
      }
      const application = await getApplication(applicationId);
      if (!application) return res.status(404).json({ message: "Bewerbung nicht gefunden." });

      // One page per application.
      const existing = await getCreatorForApplication(application.id);
      if (existing) return res.status(200).json({ creator: existing });

      const creator = await createCreatorFromApplication(application);
      return res.status(201).json({ creator });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/admin/creators]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Serverfehler." });
  }
}
