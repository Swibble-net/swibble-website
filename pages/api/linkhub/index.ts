import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { createProfile, getAllProfiles } from "@/lib/linkhub/profiles";
import type { LinkhubProfileInput } from "@/lib/linkhub/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "GET") {
      const profiles = await getAllProfiles();
      return res.status(200).json({ profiles });
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;

      const body = req.body as Partial<LinkhubProfileInput>;
      if (!body?.name?.trim()) {
        return res.status(400).json({ message: "Name ist erforderlich." });
      }

      const profile = await createProfile({
        name: body.name,
        slug: body.slug,
        subtitle: body.subtitle,
        links: body.links ?? [],
      });

      return res.status(201).json({ profile });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/linkhub]", error);
    return res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : "Serverfehler",
      });
  }
}
