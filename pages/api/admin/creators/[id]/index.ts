import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidId, validateCreatorInput } from "@/lib/creators/config";
import {
  deleteCreator,
  getCreator,
  isSlugTaken,
  newMediaId,
  updateCreatorAppVideos,
  updateCreatorProfile,
} from "@/lib/creators/store";
import type { CreatorProfile } from "@/lib/creators/types";
import { getAppVideoJob, isAppVideoApiConfigured } from "@/lib/videos/appVideos";
import type { AppVideoJob } from "@/lib/videos/types";

/** Asks the Swibble app about web copies that are still being made. */
async function refreshAppVideos(profile: CreatorProfile): Promise<CreatorProfile> {
  const pending = profile.videos.filter((v) => v.source === "app" && v.status === "processing");
  if (pending.length === 0 || !isAppVideoApiConfigured()) return profile;
  const jobs = new Map<string, AppVideoJob>();
  await Promise.all(
    pending.map(async (video) => {
      const job = await getAppVideoJob(video.appJobId).catch(() => null);
      if (job) jobs.set(video.appJobId, job);
    }),
  );
  if (jobs.size === 0) return profile;
  return (await updateCreatorAppVideos(profile, jobs)) ?? profile;
}

/** GET (refreshes processing app videos) · PUT profile fields · DELETE page with files */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  const { id } = req.query;
  if (!isValidId(id)) return res.status(400).json({ message: "Ungültige ID." });

  try {
    const profile = await getCreator(id);
    if (!profile) return res.status(404).json({ message: "Nicht gefunden." });

    if (req.method === "GET") {
      return res.status(200).json({ creator: await refreshAppVideos(profile) });
    }

    if (req.method === "PUT") {
      const result = validateCreatorInput(req.body, newMediaId);
      if (!result.ok) return res.status(400).json({ message: result.message });
      if (await isSlugTaken(result.value.slug, profile.id)) {
        return res.status(400).json({ message: "Diese Adresse hat schon ein anderer Creator." });
      }
      if (result.value.published && profile.photos.length === 0) {
        return res.status(400).json({ message: "Zum Veröffentlichen braucht die Seite mindestens ein Foto." });
      }
      const creator = await updateCreatorProfile(profile.id, result.value);
      return res.status(200).json({ creator });
    }

    if (req.method === "DELETE") {
      await deleteCreator(profile);
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/admin/creators/:id]", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json({ message: "Serverfehler." });
  }
}
