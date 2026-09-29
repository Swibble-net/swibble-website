import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidId } from "@/lib/pitchdecks/config";
import { deletePitchDeck, getPitchDeck } from "@/lib/pitchdecks/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  if (!isValidId(id)) return res.status(400).json({ message: "Ungültige ID." });

  try {
    const deck = await getPitchDeck(id);
    if (!deck) return res.status(404).json({ message: "Präsentation nicht gefunden." });
    await deletePitchDeck(deck);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[/api/admin/pitchdecks/:id]", error);
    return res.status(500).json({ message: "Löschen fehlgeschlagen." });
  }
}
