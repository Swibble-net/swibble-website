import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { validateOfferInput } from "@/lib/offers/config";
import { createOffer, isOfferStoreAvailable, listOffers } from "@/lib/offers/store";

/** GET: all web offers · POST {customer, title}: new offer with its own link */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  try {
    if (req.method === "GET") {
      return res.status(200).json({ offers: await listOffers() });
    }

    if (req.method === "POST") {
      if (!isOfferStoreAvailable()) {
        return res.status(503).json({ message: "Datenbank nicht konfiguriert." });
      }
      const result = validateOfferInput({ ...(req.body ?? {}), items: [] });
      if (!result.ok) return res.status(400).json({ message: result.message });
      const offer = await createOffer(result.value.customer, result.value.title);
      return res.status(201).json({ offer });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/admin/offers]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Serverfehler." });
  }
}
