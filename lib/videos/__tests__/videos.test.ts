import { describe, expect, it } from "vitest";
import { appJobFields, isPlayable, toCoverPath, toVideo } from "@/lib/videos/videos";
import { silenceIfHidden, toggleUnmuted } from "@/lib/videos/sound";
import { toEmbedUrl } from "@/lib/videos/embed";

const media = (file: string) =>
  `https://firebasestorage.googleapis.com/v0/b/bucket/o/website-videos%2Fjob%2F${file}?alt=media&token=abc`;

describe("toVideo", () => {
  it("keeps existing YouTube/Vimeo documents working without the new fields", () => {
    const video = toVideo("v1", {
      title: "Alt",
      embedUrl: "https://player.vimeo.com/video/1",
      coverPath: "/video-covers/a.jpg",
      createdAt: 5,
    });
    expect(video).toMatchObject({ source: "embed", status: "ready", videoUrl: "", hasAudio: false });
    expect(isPlayable(video)).toBe(true);
  });

  it("drops media URLs that are not our own web copies", () => {
    const video = toVideo("v2", {
      source: "app",
      status: "ready",
      videoUrl: "https://evil.example/video.mp4",
      coverUrl: media("cover.jpg"),
    });
    expect(video.videoUrl).toBe("");
    expect(video.coverUrl).toBe(media("cover.jpg"));
    expect(isPlayable(video)).toBe(false);
  });

  it("hides app videos from visitors until the compressed copy is ready", () => {
    expect(isPlayable(toVideo("v3", { source: "app", appJobId: "j" }))).toBe(false);
    expect(isPlayable(toVideo("v4", { source: "app", status: "failed", videoUrl: media("video.mp4") }))).toBe(false);
    expect(isPlayable(toVideo("v5", { source: "app", status: "ready", videoUrl: media("video.mp4") }))).toBe(true);
  });
});

describe("appJobFields", () => {
  it("maps app job states onto stored fields", () => {
    expect(appJobFields({ jobId: "j", status: "queued" })).toEqual({ status: "processing" });
    expect(appJobFields({ jobId: "j", status: "processing" })).toEqual({ status: "processing" });
    expect(appJobFields({ jobId: "j", status: "unavailable" })).toEqual({ status: "failed" });
    expect(
      appJobFields({ jobId: "j", status: "ready", videoUrl: media("video.mp4"), coverUrl: media("cover.jpg"),
        width: 720, height: 1280, duration: 21.4, size: 3_900_000, hasAudio: true }),
    ).toEqual({ status: "ready", videoUrl: media("video.mp4"), coverUrl: media("cover.jpg"),
      width: 720, height: 1280, duration: 21.4, size: 3_900_000, hasAudio: true });
  });

  it("never marks a copy ready when the app reports foreign URLs", () => {
    expect(
      appJobFields({ jobId: "j", status: "ready", videoUrl: "https://evil.example/v.mp4", coverUrl: media("cover.jpg") }),
    ).toEqual({ status: "failed" });
  });
});

describe("sound", () => {
  it("allows at most one audible video", () => {
    expect(toggleUnmuted(null, "a")).toBe("a");
    expect(toggleUnmuted("a", "b")).toBe("b");
    expect(toggleUnmuted("b", "b")).toBeNull();
  });

  it("silences only the video that left the viewport", () => {
    expect(silenceIfHidden("a", "a")).toBeNull();
    expect(silenceIfHidden("a", "b")).toBe("a");
    expect(silenceIfHidden(null, "b")).toBeNull();
  });
});

describe("existing helpers", () => {
  it("normalizes embeds and restricts covers to local files", () => {
    expect(toEmbedUrl("https://vimeo.com/1093776495")).toContain("player.vimeo.com/video/1093776495?");
    expect(toEmbedUrl("https://youtu.be/abc123")).toContain("youtube-nocookie.com/embed/abc123?");
    expect(toCoverPath(" projekt.webp ")).toBe("/video-covers/projekt.webp");
    expect(toCoverPath("")).toBe("");
    expect(() => toCoverPath("https://evil.example/x.png")).toThrow();
    expect(() => toCoverPath("../secret.png")).toThrow();
  });
});
