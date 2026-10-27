import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidId } from "@/lib/creators/config";
import { validateOfferInput } from "@/lib/offers/config";
import { deleteOffer, getOffer, updateOffer } from "@/lib/offers/store";

/** GET · PUT {customer, title, message, items, active} · DELETE one web offer */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  const { id } = req.query;
  if (!isValidId(id)) return res.status(400).json({ message: "Ungültige ID." });

  try {
    const offer = await getOffer(id);
    if (!offer) return res.status(404).json({ message: "Nicht gefunden." });

    if (req.method === "GET") return res.status(200).json({ offer });

    if (req.method === "PUT") {
      const result = validateOfferInput(req.body);
      if (!result.ok) return res.status(400).json({ message: result.message });
      return res.status(200).json({ offer: await updateOffer(offer.id, result.value) });
    }

    if (req.method === "DELETE") {
      await deleteOffer(offer.id);
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/admin/offers/:id]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Serverfehler." });
  }
}
