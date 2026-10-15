import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  applicationVideoSource,
  getApplication,
  readApplicationFile,
  type ApplicationFileTarget,
} from "@/lib/applications/store";

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
    // Default: the parental consent file. ?photo=<index> serves one of the
    // applicant photos, ?file=release|setcard the creator pool documents.
    let target: ApplicationFileTarget = { kind: "consent" };
    const photoParam = req.query.photo;
    const fileParam = req.query.file;
    const videoParam = req.query.video ?? req.query.videoCover;

    // ?video=<index>: too large for a function response, a signed link instead.
    if (videoParam !== undefined) {
      const index = typeof videoParam === "string" ? Number(videoParam) : NaN;
      if (!Number.isInteger(index) || index < 0 || index > 20) {
        return res.status(400).json({ message: "Ungültiges Video." });
      }
      const application = await getApplication(id);
      if (!application) return res.status(404).json({ message: "Nicht gefunden." });
      if (req.query.videoCover !== undefined) {
        target = { kind: "videoCover", index };
      } else {
        const source = await applicationVideoSource(application, index);
        if (!source) return res.status(404).json({ message: "Kein Video vorhanden." });
        res.setHeader("Cache-Control", "private, no-store");
        if (source.kind === "redirect") return res.redirect(302, source.url);
        res.setHeader("Content-Type", source.contentType);
        return res.status(200).send(source.buffer);
      }
    } else if (photoParam !== undefined) {
      const index = typeof photoParam === "string" ? Number(photoParam) : NaN;
      if (!Number.isInteger(index) || index < 0 || index > 20) {
        return res.status(400).json({ message: "Ungültiges Foto." });
      }
      target = { kind: "photo", index };
    } else if (fileParam !== undefined) {
      if (fileParam !== "release" && fileParam !== "setcard") {
        return res.status(400).json({ message: "Unbekannte Datei." });
      }
      target = { kind: fileParam };
    }

    const application = await getApplication(id);
    const file = application
      ? await readApplicationFile(application, target)
      : null;
    if (!file) return res.status(404).json({ message: "Keine Datei vorhanden." });

    // Neutral file name: no applicant name in download history or headers.
    const short = id.slice(0, 8);
    const filename =
      target.kind === "photo"
        ? `foto-${short}-${target.index + 1}.${file.extension}`
        : target.kind === "videoCover"
          ? `video-cover-${short}-${target.index + 1}.jpg`
        : target.kind === "release"
          ? `creator-freigabe-${short}.${file.extension}`
          : target.kind === "setcard"
            ? `setcard-${short}.${file.extension}`
            : `einverstaendnis-${short}.${file.extension}`;
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
