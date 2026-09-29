import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { validateInput } from "@/lib/pitchdecks/config";
import { createPitchDeck, storeProblem } from "@/lib/pitchdecks/store";

/**
 * Step 1 of an upload: registers the deck (status "uploading") and returns
 * its id. The slide images and PDF chunks follow via ./[id]/upload, then
 * ./[id]/complete makes the public link work.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const problem = storeProblem();
  if (problem) return res.status(503).json({ message: problem });

  const result = validateInput(req.body);
  if (!result.ok) return res.status(400).json({ message: result.message });

  try {
    const deck = await createPitchDeck(result.input);
    return res.status(201).json({ id: deck.id, slug: deck.slug });
  } catch (error) {
    console.error("[/api/admin/pitchdecks]", error);
    return res.status(500).json({ message: "Die Präsentation konnte nicht angelegt werden." });
  }
}
