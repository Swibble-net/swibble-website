import type { NextApiRequest, NextApiResponse } from "next";
import { isValidSlug } from "@/lib/pitchdecks/config";
import { getReadyPitchDeckBySlug, readPage } from "@/lib/pitchdecks/store";

/** One slide image of a customer deck: /api/pitch/<slug>/pages/<1-based number> */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slug } = req.query;
  const page = Number(req.query.page);
  if (!isValidSlug(slug) || !Number.isInteger(page) || page < 1) {
    return res.status(404).json({ message: "Nicht gefunden." });
  }

  try {
    const deck = await getReadyPitchDeckBySlug(slug);
    const buffer = deck && page <= deck.pages.length ? await readPage(deck, page - 1) : null;
    if (!buffer) return res.status(404).json({ message: "Nicht gefunden." });

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Length", buffer.length);
    // The slides of a deck never change (a new upload gets a new link). The CDN
    // copy expires after a day, so a deleted deck disappears from the edge too.
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noimageindex");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("[/api/pitch/:slug/pages/:page]", error);
    return res.status(500).json({ message: "Folie konnte nicht geladen werden." });
  }
}
