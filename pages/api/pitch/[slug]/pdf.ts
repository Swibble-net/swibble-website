import type { NextApiRequest, NextApiResponse } from "next";
import { contentDisposition, downloadFileName, isValidSlug } from "@/lib/pitchdecks/config";
import { getReadyPitchDeckBySlug, pdfSource } from "@/lib/pitchdecks/store";

/** The deck's PDF: ?download=1 saves it, otherwise the browser opens it. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slug } = req.query;
  if (!isValidSlug(slug)) return res.status(404).json({ message: "Nicht gefunden." });

  try {
    const deck = await getReadyPitchDeckBySlug(slug);
    const type = req.query.download === "1" ? "attachment" : "inline";
    const source = deck ? await pdfSource(deck, type) : null;
    if (!deck || !source) return res.status(404).json({ message: "Nicht gefunden." });

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");

    if (source.kind === "redirect") {
      return res.redirect(302, source.url);
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", source.buffer.length);
    res.setHeader("Content-Disposition", contentDisposition(type, downloadFileName(deck)));
    return res.status(200).send(source.buffer);
  } catch (error) {
    console.error("[/api/pitch/:slug/pdf]", error);
    return res.status(500).json({ message: "PDF konnte nicht geladen werden." });
  }
}
