import type { NextApiRequest, NextApiResponse } from "next";
import { getVideo } from "@/lib/videos/videos";
import { fetchTikTokCover } from "@/lib/videos/tiktok";

/**
 * Cover for TikTok videos. TikTok's thumbnail URLs expire, so the image is
 * fetched on demand and cached at the CDN; visitors never contact TikTok for it.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (req.method !== "GET" || typeof id !== "string" || !id) {
    return res.status(400).json({ message: "Ungültige Anfrage." });
  }

  try {
    const video = await getVideo(id);
    if (!video?.sourceUrl) {
      return res.status(404).json({ message: "Nicht gefunden." });
    }
    const cover = await fetchTikTokCover(video.sourceUrl);
    res.setHeader("Content-Type", cover.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    return res.status(200).send(cover.body);
  } catch (error) {
    console.error(`[/api/videos/cover/${id}]`, error);
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(502).json({ message: "Kein Vorschaubild." });
  }
}
