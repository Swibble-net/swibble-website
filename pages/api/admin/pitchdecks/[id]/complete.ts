import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidId } from "@/lib/pitchdecks/config";
import { completePitchDeck, getPitchDeck } from "@/lib/pitchdecks/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  if (!isValidId(id)) return res.status(400).json({ message: "Ungültige ID." });

  try {
    const deck = await getPitchDeck(id);
    if (!deck) return res.status(404).json({ message: "Präsentation nicht gefunden." });
    if (deck.status === "ready") return res.status(200).json({ slug: deck.slug });

    const result = await completePitchDeck(deck);
    if (!result.ok) return res.status(400).json({ message: result.message });
    return res.status(200).json({ slug: deck.slug });
  } catch (error) {
    console.error("[/api/admin/pitchdecks/:id/complete]", error);
    return res.status(500).json({ message: "Die Präsentation konnte nicht abgeschlossen werden." });
  }
}
