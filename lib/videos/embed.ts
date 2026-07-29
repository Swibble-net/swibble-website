/**
 * Convert a pasted video link into an iframe-ready embed URL that
 * autoplays muted and loops — matching the carousel behaviour.
 *
 * Supported: YouTube (watch / shorts / youtu.be / embed) and Vimeo.
 * Unknown providers are returned unchanged so any embed link still works.
 */
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
