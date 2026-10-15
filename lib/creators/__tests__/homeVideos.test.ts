import { describe, expect, it } from "vitest";
import type { Video } from "@/lib/videos/types";
import { isCopyableHomeVideo } from "../homeVideos";

const TRUSTED =
  "https://firebasestorage.googleapis.com/v0/b/bucket/o/website-videos%2Fhosted-1%2Fvideo.mp4?alt=media&token=t-1";

const video = (overrides: Partial<Video>): Video => ({
  id: "v1",
  title: "Botox auch für Männer",
  source: "app",
  embedUrl: "",
  coverPath: "",
  sourceUrl: "",
  videoUrl: TRUSTED,
  coverUrl: "",
  width: 720,
  height: 1280,
  duration: 33,
  size: 4_000_000,
  hasAudio: true,
  appJobId: "",
  accountName: "Montis Medical",
  status: "ready",
  createdAt: 0,
  ...overrides,
});

describe("isCopyableHomeVideo", () => {
  it("takes finished MP4s from our own storage", () => {
    expect(isCopyableHomeVideo(video({}))).toBe(true);
  });

  it("skips embeds, unfinished videos and foreign URLs", () => {
    expect(isCopyableHomeVideo(video({ source: "embed", embedUrl: "https://player.vimeo.com/video/1" }))).toBe(false);
    expect(isCopyableHomeVideo(video({ status: "processing" }))).toBe(false);
    expect(isCopyableHomeVideo(video({ videoUrl: "https://example.com/video.mp4" }))).toBe(false);
  });
});
