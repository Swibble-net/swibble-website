import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidId, validateCreatorInput, validateCreatorRoles } from "@/lib/creators/config";
import { refreshCreatorAppVideos } from "@/lib/creators/appVideos";
import {
  deleteCreator,
  getCreator,
  isSlugTaken,
  newMediaId,
  setCreatorPreviewLink,
  updateCreatorProfile,
  updateCreatorRoles,
} from "@/lib/creators/store";

/**
 * GET (refreshes processing app videos) · PUT profile fields
 * · PATCH {roles} services only · PATCH {previewLink} preview link on/off
 * · DELETE page with files
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  const { id } = req.query;
  if (!isValidId(id)) return res.status(400).json({ message: "Ungültige ID." });

  try {
    const profile = await getCreator(id);
    if (!profile) return res.status(404).json({ message: "Nicht gefunden." });

    if (req.method === "GET") {
      return res.status(200).json({ creator: await refreshCreatorAppVideos(profile) });
    }

    if (req.method === "PUT") {
      const result = validateCreatorInput(req.body, newMediaId);
      if (!result.ok) return res.status(400).json({ message: result.message });
      if (await isSlugTaken(result.value.slug, profile.id)) {
        return res.status(400).json({ message: "Diese Adresse hat schon ein anderer Creator." });
      }
      if (result.value.published && !profile.photos.some((p) => !p.hidden)) {
        return res
          .status(400)
          .json({ message: "Zum Veröffentlichen braucht die Seite mindestens ein sichtbares Foto." });
      }
      const creator = await updateCreatorProfile(profile.id, result.value);
      return res.status(200).json({ creator });
    }

    if (req.method === "PATCH") {
      const previewLink = (req.body ?? {}).previewLink;
      if (typeof previewLink === "boolean") {
        return res.status(200).json({ creator: await setCreatorPreviewLink(profile.id, previewLink) });
      }
      const roles = validateCreatorRoles((req.body ?? {}).roles);
      if (!roles) return res.status(400).json({ message: "Mindestens eine Leistung muss aktiv bleiben." });
      return res.status(200).json({ creator: await updateCreatorRoles(profile.id, roles) });
    }

    if (req.method === "DELETE") {
      await deleteCreator(profile);
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/admin/creators/:id]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Serverfehler." });
  }
}
