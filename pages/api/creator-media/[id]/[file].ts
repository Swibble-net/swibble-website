import type { NextApiRequest, NextApiResponse } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { PREVIEW_PARAM, isValidId, opensPreview, parseMediaFile } from "@/lib/creators/config";
import { getCreator, readCreatorMedia } from "@/lib/creators/store";

// Photos, covers and the setcard are streamed from the private bucket; uploaded
// videos are too large for a function response and get a signed link instead.
export const config = { api: { responseLimit: "5mb" } };

/**
 * Media of a creator page. Public once the page is published; before that
 * only for the signed-in admin (editor previews) and with the page's preview
 * link (?vorschau=<token>). The path inside the bucket always comes from the
 * profile, never from the URL.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id, file } = req.query;
  const target = typeof file === "string" ? parseMediaFile(file) : null;
  if (!isValidId(id) || !target) return res.status(404).json({ message: "Nicht gefunden." });

  try {
    const profile = await getCreator(id);
    const admin = isAuthenticated(req);
    const shared = Boolean(profile && !profile.published && opensPreview(profile, req.query[PREVIEW_PARAM]));
    if (!profile || (!profile.published && !admin && !shared)) {
      return res.status(404).json({ message: "Nicht gefunden." });
    }

    // Media hidden in the CMS stay private, even if the link is known.
    if (!admin && target.kind !== "setcard") {
      const item =
        target.kind === "photo" || target.kind === "thumb"
          ? profile.photos.find((p) => p.id === target.id)
          : profile.videos.find((v) => v.id === target.id);
      if (!item || item.hidden) return res.status(404).json({ message: "Nicht gefunden." });
    }

    const source = await readCreatorMedia(profile, target);
    if (!source) return res.status(404).json({ message: "Nicht gefunden." });

    // Published media may be cached briefly; drafts never.
    const cache = profile.published && !admin
      ? "public, max-age=600, s-maxage=3600"
      : "private, no-store";
    res.setHeader("X-Robots-Tag", "noindex");

    if (source.kind === "redirect") {
      res.setHeader("Cache-Control", profile.published ? "public, max-age=300" : "private, no-store");
      return res.redirect(302, source.url);
    }

    res.setHeader("Content-Type", source.contentType);
    res.setHeader("Content-Length", source.buffer.length);
    res.setHeader("Cache-Control", cache);
    if (target.kind === "setcard") {
      const extension =
        source.contentType === "application/pdf" ? "pdf" : source.contentType === "image/png" ? "png" : "jpg";
      res.setHeader("Content-Disposition", `inline; filename="setcard-${profile.slug}.${extension}"`);
    }
    return res.status(200).send(req.method === "HEAD" ? "" : source.buffer);
  } catch (error) {
    console.error("[/api/creator-media]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Datei konnte nicht geladen werden." });
  }
}
