import { beforeAll, describe, expect, it } from "vitest";
import { hashUploadToken, isValidUploadToken } from "../uploadToken";

describe("upload token", () => {
  const pending = {
    tokenHash: hashUploadToken("a-long-random-token-123"),
    expiresAt: 2_000,
    photos: 1,
    videos: [],
    setcard: false,
    consent: false,
  };

  it("accepts the right token until it expires", () => {
    expect(isValidUploadToken(pending, "a-long-random-token-123", 1_000)).toBe(true);
    expect(isValidUploadToken(pending, "a-long-random-token-123", 3_000)).toBe(false);
  });

  it("rejects wrong, short or missing tokens and finished uploads", () => {
    expect(isValidUploadToken(pending, "another-long-token-4567", 1_000)).toBe(false);
    expect(isValidUploadToken(pending, "short", 1_000)).toBe(false);
    expect(isValidUploadToken(pending, undefined, 1_000)).toBe(false);
    expect(isValidUploadToken(null, "a-long-random-token-123", 1_000)).toBe(false);
  });
});

describe("staged creator upload (in-memory store)", () => {
  beforeAll(() => {
    process.env.APPLICATIONS_DEV_STORE = "memory";
  });

  const jpeg = (size: number) => {
    const buffer = Buffer.alloc(size, 7);
    buffer[0] = 0xff;
    buffer[1] = 0xd8;
    buffer[2] = 0xff;
    return buffer;
  };

  it("stores photos, release and a video in pieces, then completes", async () => {
    const store = await import("../store");
    const chunk = 4 * 1024 * 1024;
    const videoSize = chunk + 10;
    const application = await store.createApplication(
      {
        ...store.toApplication("x", {}),
        pool: "creator",
        incomplete: true,
        pendingUpload: {
          tokenHash: hashUploadToken("token-for-the-test-1234"),
          expiresAt: Date.now() + 60_000,
          photos: 2,
          videos: [{ size: videoSize, contentType: "video/mp4" }],
          setcard: false,
          consent: false,
        },
      },
      { consent: null, release: null, setcard: null, photos: [] },
    );

    // Not everything there yet: completing fails and changes nothing.
    await store.saveApplicationUpload(application.id, { kind: "photo", index: 0 }, jpeg(10), "image/jpeg");
    const early = await store.completeApplicationUpload((await store.getApplication(application.id))!);
    expect(early.ok).toBe(false);

    await store.saveApplicationUpload(application.id, { kind: "photo", index: 1 }, jpeg(10), "image/jpeg");
    await store.saveApplicationUpload(application.id, { kind: "release" }, jpeg(20), "image/jpeg");
    await store.saveApplicationUpload(application.id, { kind: "videoCover", index: 0 }, jpeg(5), "image/jpeg");
    await store.saveApplicationUpload(application.id, { kind: "videoChunk", index: 0, chunk: 0 }, Buffer.alloc(chunk), "application/octet-stream");
    await store.saveApplicationUpload(application.id, { kind: "videoChunk", index: 0, chunk: 1 }, Buffer.alloc(10), "application/octet-stream");

    const result = await store.completeApplicationUpload((await store.getApplication(application.id))!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.application.incomplete).toBe(false);
    expect(result.application.pendingUpload).toBeNull();
    expect(result.application.photos).toHaveLength(2);
    expect(result.application.releaseFile?.size).toBe(20);
    expect(result.application.videos).toEqual([
      expect.objectContaining({ size: videoSize, contentType: "video/mp4" }),
    ]);
    expect(result.application.videos[0].coverPath).not.toBe("");

    // Withdrawal removes everything, including the joined video.
    const videoPath = result.application.videos[0].path;
    expect(await store.readApplicationObject(videoPath)).not.toBeNull();
    await store.deleteApplication(application.id);
    expect(await store.readApplicationObject(videoPath)).toBeNull();
  });
});
