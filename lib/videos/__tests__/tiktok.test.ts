import { afterEach, describe, expect, it, vi } from "vitest";
import { isTikTokEmbed, isTikTokShortLink, tiktokVideoId, toEmbedUrl } from "@/lib/videos/embed";
import { fetchTikTokCover, isTikTokCdnUrl, resolveTikTokUrl } from "@/lib/videos/tiktok";

const VIDEO = "https://www.tiktok.com/@aquisplaza/video/7412345678901234567";

describe("TikTok links", () => {
  it("extracts the video id from watch, embed and player URLs only", () => {
    expect(tiktokVideoId(VIDEO)).toBe("7412345678901234567");
    expect(tiktokVideoId(`${VIDEO}?is_from_webapp=1&sender_device=pc`)).toBe("7412345678901234567");
    expect(tiktokVideoId("https://m.tiktok.com/@x/video/7412345678901234567/")).toBe("7412345678901234567");
    expect(tiktokVideoId("https://www.tiktok.com/embed/v2/7412345678901234567")).toBe("7412345678901234567");
    expect(tiktokVideoId("https://www.tiktok.com/player/v1/7412345678901234567?autoplay=1")).toBe("7412345678901234567");
    for (const other of [
      "https://www.tiktok.com/@aquisplaza",
      "https://evil.example/@x/video/7412345678901234567",
      "https://tiktok.com.evil.example/@x/video/7412345678901234567",
      "https://vimeo.com/1093776495",
      "not a url",
    ]) {
      expect(tiktokVideoId(other)).toBe("");
    }
  });

  it("builds a chrome-less autoplaying player URL", () => {
    const embed = toEmbedUrl(VIDEO);
    expect(embed.startsWith("https://www.tiktok.com/player/v1/7412345678901234567?")).toBe(true);
    const params = new URL(embed).searchParams;
    expect(Object.fromEntries(params)).toMatchObject({ autoplay: "1", loop: "1", controls: "0", volume_control: "0", rel: "0" });
    expect(isTikTokEmbed(embed)).toBe(true);
    expect(isTikTokEmbed("https://player.vimeo.com/video/1")).toBe(false);
  });

  it("recognises share links", () => {
    expect(isTikTokShortLink("https://vm.tiktok.com/ZNabc123/")).toBe(true);
    expect(isTikTokShortLink("https://vt.tiktok.com/ZSabc/")).toBe(true);
    expect(isTikTokShortLink("https://www.tiktok.com/t/ZTabc/")).toBe(true);
    expect(isTikTokShortLink("http://vm.tiktok.com/ZNabc123/")).toBe(false);
    expect(isTikTokShortLink(VIDEO)).toBe(false);
    expect(isTikTokShortLink("https://vm.tiktok.com.evil.example/x")).toBe(false);
  });
});

describe("TikTok server helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves share links and rejects ones that do not end at a video", async () => {
    expect(await resolveTikTokUrl(VIDEO)).toBe(VIDEO);

    vi.stubGlobal("fetch", vi.fn(async () => ({ url: `${VIDEO}?_r=1&share=x`, body: null })));
    expect(await resolveTikTokUrl("https://vm.tiktok.com/ZNabc123/")).toBe(VIDEO);

    vi.stubGlobal("fetch", vi.fn(async () => ({ url: "https://www.tiktok.com/@aquisplaza", body: null })));
    await expect(resolveTikTokUrl("https://vm.tiktok.com/ZNabc123/")).rejects.toThrow();
  });

  it("only trusts TikTok CDN hosts for covers", () => {
    expect(isTikTokCdnUrl("https://p16-common-sign.tiktokcdn-eu.com/tos/abc.jpeg?x-expires=1")).toBe(true);
    expect(isTikTokCdnUrl("https://p16-sign-va.tiktokcdn.com/obj/abc")).toBe(true);
    expect(isTikTokCdnUrl("http://p16.tiktokcdn.com/abc")).toBe(false);
    expect(isTikTokCdnUrl("https://tiktokcdn.com.evil.example/abc")).toBe(false);
    expect(isTikTokCdnUrl("https://evil.example/abc")).toBe(false);
    expect(isTikTokCdnUrl(undefined)).toBe(false);
  });

  it("fetches the cover through oEmbed and validates host, type and size", async () => {
    const image = Buffer.from("jpeg-bytes");
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.startsWith("https://www.tiktok.com/oembed?url=")) {
        return Response.json({ thumbnail_url: "https://p16-common-sign.tiktokcdn-eu.com/cover.jpeg" });
      }
      return new Response(image, { status: 200, headers: { "content-type": "image/jpeg" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const cover = await fetchTikTokCover(VIDEO);
    expect(cover.contentType).toBe("image/jpeg");
    expect(cover.body.equals(image)).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://www.tiktok.com/oembed?url=${encodeURIComponent(VIDEO)}`);

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ thumbnail_url: "https://evil.example/cover.jpeg" })));
    await expect(fetchTikTokCover(VIDEO)).rejects.toThrow();
    await expect(fetchTikTokCover("https://vimeo.com/1")).rejects.toThrow();
  });
});
