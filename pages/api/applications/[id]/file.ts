import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { getApplication, readConsentFile } from "@/lib/applications/store";

// The file is streamed through this admin-only route; the bucket itself is
// never exposed (no public objects, no signed URLs).
export const config = { api: { responseLimit: "5mb" } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    // ?photo=<index> serves one of the optional applicant photos instead.
    const photoParam = req.query.photo;
    let photoIndex: number | undefined;
    if (photoParam !== undefined) {
      photoIndex = typeof photoParam === "string" ? Number(photoParam) : NaN;
      if (!Number.isInteger(photoIndex) || photoIndex < 0 || photoIndex > 20) {
        return res.status(400).json({ message: "Ungültiges Foto." });
      }
    }

    const application = await getApplication(id);
    const file = application
      ? await readConsentFile(application, photoIndex)
      : null;
    if (!file) return res.status(404).json({ message: "Keine Datei vorhanden." });

    // Neutral file name: no applicant name in download history or headers.
    const filename =
      photoIndex === undefined
        ? `einverstaendnis-${id.slice(0, 8)}.${file.extension}`
        : `foto-${id.slice(0, 8)}-${photoIndex + 1}.${file.extension}`;
    const disposition = req.query.download === "1" ? "attachment" : "inline";

    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Length", file.buffer.length);
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    return res.status(200).send(file.buffer);
  } catch (error) {
    console.error(
      "[/api/applications/:id/file]",
      error instanceof Error ? error.name : "UnknownError",
    );
    return res.status(500).json({ message: "Datei konnte nicht geladen werden." });
  }
}
