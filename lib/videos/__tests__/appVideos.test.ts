import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppVideoError,
  getAppVideoJob,
  isAppVideoApiConfigured,
  isTrustedMediaUrl,
  listAppVideos,
  publishAppVideo,
} from "@/lib/videos/appVideos";

const KEY = "k".repeat(40);
const BASE = "https://europe-west3-example.cloudfunctions.net/websiteVideoApi";
const TRUSTED =
  "https://firebasestorage.googleapis.com/v0/b/bucket/o/website-videos%2Fabc%2Fvideo.mp4?alt=media&token=t-1";

describe("isTrustedMediaUrl", () => {
  it("accepts only tokenized web copies on Firebase Storage", () => {
    expect(isTrustedMediaUrl(TRUSTED)).toBe(true);
    for (const value of [
      TRUSTED.replace("https:", "http:"),
      TRUSTED.replace("firebasestorage.googleapis.com", "evil.example"),
      TRUSTED.replace("website-videos%2F", "customer-video-previews%2F"),
      TRUSTED.replace("&token=t-1", ""),
      "javascript:alert(1)",
      "",
      undefined,
      42,
    ]) {
      expect(isTrustedMediaUrl(value)).toBe(false);
    }
  });
});

describe("Swibble app client", () => {
  beforeEach(() => {
    vi.stubEnv("SWIBBLE_APP_VIDEO_API_URL", `${BASE}/`);
    vi.stubEnv("SWIBBLE_APP_VIDEO_API_KEY", KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires URL and a key of at least 32 characters", async () => {
    expect(isAppVideoApiConfigured()).toBe(true);
    vi.stubEnv("SWIBBLE_APP_VIDEO_API_KEY", "short");
    expect(isAppVideoApiConfigured()).toBe(false);
    await expect(listAppVideos({})).rejects.toMatchObject({ status: 503 });
  });

  it("sends the key as bearer token, never follows redirects and paginates", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ items: [], page: 2, pages: 3, total: 30 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listAppVideos({ page: "2", q: "myzeil" });

    expect(result.page).toBe(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe(`${BASE}/candidates?page=2&limit=12&q=myzeil`);
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${KEY}` });
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
  });

  it("posts the selection as JSON when publishing", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ jobId: "a".repeat(64), status: "queued" }, { status: 202 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const job = await publishAppVideo("p1--raw1", "file-1");

    expect(job.status).toBe("queued");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe(`${BASE}/publish`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ assetId: "p1--raw1", fileId: "file-1" });
  });

  it("refuses plain http and hides a rejected key behind a gateway error", async () => {
    vi.stubEnv("SWIBBLE_APP_VIDEO_API_URL", "http://insecure.example/api");
    await expect(getAppVideoJob("x")).rejects.toBeInstanceOf(AppVideoError);

    vi.stubEnv("SWIBBLE_APP_VIDEO_API_URL", BASE);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Nicht autorisiert." }, { status: 401 })),
    );
    await expect(getAppVideoJob("x")).rejects.toMatchObject({ status: 502 });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Nicht gefunden.", code: "WEBSITE_VIDEO_NOT_FOUND" }, { status: 404 }),
      ),
    );
    await expect(getAppVideoJob("x")).rejects.toMatchObject({
      status: 404,
      code: "WEBSITE_VIDEO_NOT_FOUND",
      message: "Nicht gefunden.",
    });
  });
});
