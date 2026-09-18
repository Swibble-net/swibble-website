/**
 * Convert a pasted video link into an iframe-ready embed URL that
 * autoplays muted and loops — matching the carousel behaviour.
 *
 * Supported: YouTube (watch / shorts / youtu.be / embed), Vimeo and TikTok.
 * Unknown providers are returned unchanged so any embed link still works.
 */
const TIKTOK_HOSTS = new Set(["tiktok.com", "m.tiktok.com"]);
const TIKTOK_SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);

function hostOf(raw: string): { url: URL; host: string } | null {
  try {
    const url = new URL(raw.trim());
    return { url, host: url.hostname.replace(/^www\./, "").toLowerCase() };
  } catch {
    return null;
  }
}

/** Numeric video id of a TikTok watch, embed or player URL; "" for anything else. */
export function tiktokVideoId(raw: string): string {
  const parsed = hostOf(raw);
  if (!parsed || !TIKTOK_HOSTS.has(parsed.host)) return "";
  const match = parsed.url.pathname.match(
    /^\/(?:@[^/]+\/video|embed(?:\/v2)?|player\/v1)\/(\d{8,25})\/?$/,
  );
  return match?.[1] ?? "";
}

/** Share links (vm.tiktok.com/…, tiktok.com/t/…) only reveal the video after a redirect. */
export function isTikTokShortLink(raw: string): boolean {
  const parsed = hostOf(raw);
  if (!parsed || parsed.url.protocol !== "https:") return false;
  return (
    TIKTOK_SHORT_HOSTS.has(parsed.host) ||
    (TIKTOK_HOSTS.has(parsed.host) && parsed.url.pathname.startsWith("/t/"))
  );
}

export function isTikTokEmbed(embedUrl: string): boolean {
  return Boolean(tiktokVideoId(embedUrl)) && embedUrl.includes("/player/v1/");
}

export function toEmbedUrl(raw: string): string {
  const url = raw.trim();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  // YouTube — extract the video id from the common URL shapes
  if (
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be" ||
    host === "m.youtube.com"
  ) {
    let id = "";
    if (host === "youtu.be") {
      id = parsed.pathname.slice(1).split("/")[0];
    } else if (parsed.pathname.startsWith("/watch")) {
      id = parsed.searchParams.get("v") ?? "";
    } else if (
      parsed.pathname.startsWith("/shorts/") ||
      parsed.pathname.startsWith("/embed/")
    ) {
      id = parsed.pathname.split("/")[2] ?? "";
    }

    if (id) {
      const params = new URLSearchParams({
        autoplay: "1",
        mute: "1",
        loop: "1",
        playlist: id, // required by YouTube for loop=1 to work
        controls: "0",
        playsinline: "1",
        rel: "0",
      });
      return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
    }
  }

  // TikTok — official embed player without any chrome; muted via postMessage by the carousel
  const tiktokId = tiktokVideoId(url);
  if (tiktokId) {
    const params = new URLSearchParams({
      autoplay: "1",
      loop: "1",
      controls: "0",
      progress_bar: "0",
      play_button: "0",
      volume_control: "0",
      fullscreen_button: "0",
      timestamp: "0",
      music_info: "0",
      description: "0",
      rel: "0",
      native_context_menu: "0",
      closed_caption: "0",
    });
    return `https://www.tiktok.com/player/v1/${tiktokId}?${params}`;
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parsed.pathname
      .split("/")
      .filter(Boolean)
      .find((part) => /^\d+$/.test(part));

    if (id) {
      const params = new URLSearchParams({
        autoplay: "1",
        muted: "1",
        loop: "1",
        background: "1",
      });
      return `https://player.vimeo.com/video/${id}?${params}`;
    }
  }

  return url;
}
