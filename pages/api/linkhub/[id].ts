import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  deleteProfile,
  getProfileById,
  updateProfile,
} from "@/lib/linkhub/profiles";
import { parseApplyFields } from "@/lib/linkhub/applyLink";
import type { LinkhubProfileInput } from "@/lib/linkhub/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    if (req.method === "GET") {
      const profile = await getProfileById(id);
      if (!profile) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ profile });
    }

    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;

      const body = req.body as Partial<LinkhubProfileInput>;
      if (!body?.name?.trim()) {
        return res.status(400).json({ message: "Name ist erforderlich." });
      }

      const applyFields = parseApplyFields(body);
      if (!applyFields.ok) {
        return res.status(400).json({ message: applyFields.message });
      }

      const profile = await updateProfile(id, {
        name: body.name,
        slug: body.slug,
        subtitle: body.subtitle,
        logoUrl: body.logoUrl,
        showApplyLink: applyFields.showApplyLink,
        applyLinkLabel: applyFields.applyLinkLabel,
        links: body.links ?? [],
      });

      if (!profile) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ profile });
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;

      const ok = await deleteProfile(id);
      if (!ok) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error(`[/api/linkhub/${id}]`, error);
    return res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : "Serverfehler",
      });
  }
}
