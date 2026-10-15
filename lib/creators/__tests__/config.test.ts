import { describe, expect, it } from "vitest";
import {
  defaultCreatorName,
  parseMediaFile,
  slugBase,
  toPublicCreator,
  validateCreatorInput,
  validateCreatorName,
  videoChunkCount,
} from "../config";
import { imageSize } from "../imageSize";
import { reorderById, toCreator } from "../store";

let counter = 0;
const newId = () => `gen${++counter}`;

const valid = {
  slug: "testina-t",
  published: true,
  name: " Testina  T. ",
  roles: ["moderation", "model"],
  city: "Aachen",
  tagline: "Lifestyle & Fashion",
  socials: { instagram: "https://www.instagram.com/testina.test/", tiktok: "", youtube: "", snapchat: "" },
  portfolioUrl: "testina.example",
  showSetcard: true,
  references: [
    { id: "r1", name: "Aquis Plaza", detail: "TikTok-Serie", url: "" },
    { name: "", detail: "", url: "" },
  ],
};

describe("validateCreatorInput", () => {
  it("normalises a valid profile", () => {
    const result = validateCreatorInput(valid, newId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      name: "Testina T.",
      // Role order follows CREATOR_ROLES.
      roles: ["model", "moderation"],
      socials: { instagram: "testina.test" },
      portfolioUrl: "https://testina.example/",
      published: true,
    });
    // Empty reference rows are dropped, ids kept.
    expect(result.value.references).toEqual([
      { id: "r1", name: "Aquis Plaza", detail: "TikTok-Serie", url: "" },
    ]);
  });

  it("only releases channels that have a handle, and the portfolio only with a link", () => {
    const result = validateCreatorInput(
      { ...valid, publicSocials: ["instagram", "youtube", "bogus"], showPortfolio: true, portfolioUrl: "" },
      newId,
    );
    expect(result.ok && result.value.publicSocials).toEqual(["instagram"]);
    expect(result.ok && result.value.showPortfolio).toBe(false);
  });

  it("rejects invalid slugs, missing roles and markup", () => {
    expect(validateCreatorInput({ ...valid, slug: "Testina T" }, newId).ok).toBe(false);
    expect(validateCreatorInput({ ...valid, slug: "../admin" }, newId).ok).toBe(false);
    expect(validateCreatorInput({ ...valid, roles: ["video"] }, newId).ok).toBe(false);
    expect(validateCreatorInput({ ...valid, tagline: "<script>" }, newId).ok).toBe(false);
    expect(validateCreatorInput({ ...valid, portfolioUrl: "javascript:alert(1)" }, newId).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("keeps the surname off the web by default", () => {
    expect(defaultCreatorName("Testina", "testperson")).toBe("Testina T.");
    expect(defaultCreatorName("Testina", "")).toBe("Testina");
    expect(slugBase("Jürgen Ö.")).toBe("jurgen-o");
  });

  it("parses media file names strictly", () => {
    expect(parseMediaFile("photo-abc_1")).toEqual({ kind: "photo", id: "abc_1" });
    expect(parseMediaFile("setcard")).toEqual({ kind: "setcard" });
    expect(parseMediaFile("photo-../x")).toBeNull();
    expect(parseMediaFile("other-1")).toBeNull();
  });

  it("splits videos into 4 MB pieces", () => {
    expect(videoChunkCount(1)).toBe(1);
    expect(videoChunkCount(4 * 1024 * 1024)).toBe(1);
    expect(videoChunkCount(4 * 1024 * 1024 + 1)).toBe(2);
  });

  it("reorders by id and keeps unknown ones behind", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorderById(items, ["c", "x", "a"]).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
});

describe("validateCreatorName", () => {
  it("tidies the name of a page without application and refuses bad ones", () => {
    expect(validateCreatorName("  Karina   Gepper ")).toBe("Karina Gepper");
    expect(validateCreatorName("   ")).toBeNull();
    expect(validateCreatorName("x".repeat(61))).toBeNull();
    expect(validateCreatorName("<b>X</b>")).toBeNull();
    expect(validateCreatorName(42)).toBeNull();
  });
});

describe("toPublicCreator", () => {
  const profile = toCreator("cr1", {
    applicationId: "app-secret",
    slug: "testina-t",
    published: true,
    name: "Testina T.",
    roles: ["model"],
    setcardPath: "creators/cr1/setcard.pdf",
    setcardType: "application/pdf",
    showSetcard: false,
    photos: [
      { id: "p1", path: "creators/cr1/photos/p1.jpg", thumbPath: "creators/cr1/photos/p1-thumb.jpg", width: 4, height: 5, origin: "swibble", caption: "Aquis Plaza", hidden: false },
    ],
    videos: [
      { id: "v1", source: "upload", title: "Kunde", status: "ready", appJobId: "", videoUrl: "", coverUrl: "", path: "creators/cr1/videos/v1/video.mp4", coverPath: "", contentType: "video/mp4", size: 10, width: 9, height: 16 , hidden: false },
      { id: "v2", source: "upload", title: "", status: "uploading", appJobId: "", videoUrl: "", coverUrl: "", path: "x", coverPath: "", contentType: "video/mp4", size: 10, width: 0, height: 0 , hidden: false },
      { id: "v3", source: "app", title: "", status: "ready", appJobId: "j", videoUrl: "https://evil.example/v.mp4", coverUrl: "", path: "", coverPath: "", contentType: "", size: 0, width: 0, height: 0 , hidden: false },
    ],
  });
  const publicCreator = toPublicCreator(profile);

  it("exposes media routes, never bucket paths or the application", () => {
    const json = JSON.stringify(publicCreator);
    expect(json).not.toContain("creators/cr1");
    expect(json).not.toContain("app-secret");
    expect(publicCreator.photos[0].url).toBe("/api/creator-media/cr1/photo-p1");
  });

  it("leaves out media hidden in the CMS (the first visible photo is the cover)", () => {
    const withHidden = {
      ...profile,
      photos: [
        { ...profile.photos[0], id: "p0", hidden: true },
        ...profile.photos,
      ],
      videos: profile.videos.map((v) => ({ ...v, hidden: v.id === "v1" })),
    };
    const result = toPublicCreator(withHidden);
    expect(result.photos.map((p) => p.id)).toEqual(["p1"]);
    expect(result.videos).toEqual([]);
  });

  it("only lists playable videos with trusted URLs", () => {
    expect(publicCreator.videos.map((v) => v.id)).toEqual(["v1"]);
  });

  it("keeps channels and portfolio internal unless released", () => {
    const withContacts = {
      ...profile,
      socials: { instagram: "fynn.test", tiktok: "fynn_test", youtube: "", snapchat: "" },
      portfolioUrl: "https://fynn.example/",
    };
    const hidden = toPublicCreator(withContacts);
    expect(hidden.socials).toEqual({ instagram: "", tiktok: "", youtube: "", snapchat: "" });
    expect(hidden.portfolioUrl).toBe("");

    const released = toPublicCreator({ ...withContacts, publicSocials: ["tiktok"], showPortfolio: true });
    expect(released.socials.tiktok).toBe("fynn_test");
    expect(released.socials.instagram).toBe("");
    expect(released.portfolioUrl).toBe("https://fynn.example/");
  });

  it("offers the setcard only when switched on", () => {
    expect(publicCreator.setcardUrl).toBe("");
    expect(toPublicCreator({ ...profile, showSetcard: true }).setcardUrl).toBe(
      "/api/creator-media/cr1/setcard",
    );
  });
});

describe("imageSize", () => {
  it("reads PNG and JPEG headers", () => {
    const png = Buffer.alloc(24);
    png.writeUInt32BE(0x89504e47, 0);
    png.write("IHDR", 12, "ascii");
    png.writeUInt32BE(640, 16);
    png.writeUInt32BE(800, 20);
    expect(imageSize(png)).toEqual({ width: 640, height: 800 });

    // SOI, APP0 (length 4), SOF0 with height 300 / width 200
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x00, 0xc8, 0x03,
    ]);
    expect(imageSize(jpeg)).toEqual({ width: 200, height: 300 });
    expect(imageSize(Buffer.from("not an image"))).toBeNull();
  });
});
