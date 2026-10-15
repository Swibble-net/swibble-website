import { getAppVideoJob, isAppVideoApiConfigured } from "@/lib/videos/appVideos";
import type { AppVideoJob } from "@/lib/videos/types";
import { updateCreatorAppVideos } from "./store";
import type { CreatorProfile } from "./types";

/**
 * Asks the Swibble app about web copies that are still being made and stores
 * finished ones. Called by the editor (polling) and when a creator page is
 * opened, so a video appears even if the editor was closed in the meantime.
 */
export async function refreshCreatorAppVideos(profile: CreatorProfile): Promise<CreatorProfile> {
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
  return (await updateCreatorAppVideos(profile, jobs).catch(() => null)) ?? profile;
}
