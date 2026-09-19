import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  APPLICATION_STATUSES,
  NOTE_MAX_LENGTH,
  type ApplicationStatus,
} from "@/lib/applications/config";
import {
  deleteApplication,
  getApplication,
  updateApplication,
  type ApplicationPatch,
} from "@/lib/applications/store";

/** Admin-only: read, update (status / internal note) or permanently delete. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  if (typeof id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  res.setHeader("Cache-Control", "private, no-store");

  try {
    if (req.method === "GET") {
      const application = await getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Nicht gefunden." });
      }
      return res.status(200).json({ application });
    }

    if (req.method === "PATCH") {
      const body = (req.body ?? {}) as { status?: unknown; note?: unknown };
      const patch: ApplicationPatch = {};

      if (body.status !== undefined) {
        if (!APPLICATION_STATUSES.some((s) => s.id === body.status)) {
          return res.status(400).json({ message: "Unbekannter Status." });
        }
        patch.status = body.status as ApplicationStatus;
      }
      if (body.note !== undefined) {
        if (typeof body.note !== "string" || body.note.length > NOTE_MAX_LENGTH) {
          return res.status(400).json({
            message: `Die Notiz darf höchstens ${NOTE_MAX_LENGTH} Zeichen haben.`,
          });
        }
        patch.note = body.note.trim();
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ message: "Keine Änderungen übergeben." });
      }

      const application = await updateApplication(id, patch);
      if (!application) {
        return res.status(404).json({ message: "Nicht gefunden." });
      }
      return res.status(200).json({ application });
    }

    if (req.method === "DELETE") {
      const ok = await deleteApplication(id);
      if (!ok) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    // Error class only — no personal data in logs.
    console.error(
      "[/api/applications/:id]",
      error instanceof Error ? error.name : "UnknownError",
    );
    return res.status(500).json({
      message:
        req.method === "DELETE"
          ? "Löschen fehlgeschlagen – die Bewerbung ist noch vorhanden. Bitte versuch es noch einmal."
          : "Serverfehler.",
    });
  }
}
