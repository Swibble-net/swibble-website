import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { getApplication } from "@/lib/applications/store";
import { isValidId, validateCreatorName } from "@/lib/creators/config";
import {
  createCreatorFromApplication,
  createCreatorWithoutApplication,
  getCreatorForApplication,
  isCreatorStoreAvailable,
  listCreators,
  reorderCreators,
} from "@/lib/creators/store";

/**
 * GET: all creator pages · POST {applicationId}: page from an application
 * · POST {name, consent: true}: empty page without an application
 * · PATCH {order: ids}: order of /creator
 */
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
      const body = (req.body ?? {}) as { applicationId?: unknown; name?: unknown; consent?: unknown };
      if (body.applicationId === undefined && body.name !== undefined) {
        const name = validateCreatorName(body.name);
        if (!name) return res.status(400).json({ message: "Bitte gib einen Namen an (max. 60 Zeichen)." });
        // No signed release in the system: the admin vouches for the creator's consent.
        if (body.consent !== true) {
          return res.status(400).json({ message: "Bitte bestätige, dass das Einverständnis vorliegt." });
        }
        return res.status(201).json({ creator: await createCreatorWithoutApplication(name) });
      }
      const { applicationId } = body;
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

    if (req.method === "PATCH") {
      const order = (req.body ?? {}).order;
      if (!Array.isArray(order) || order.length > 500 || !order.every(isValidId)) {
        return res.status(400).json({ message: "Ungültige Reihenfolge." });
      }
      await reorderCreators(order);
      return res.status(200).json({ creators: await listCreators() });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/admin/creators]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Serverfehler." });
  }
}
