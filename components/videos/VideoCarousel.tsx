import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { Video } from "@/lib/videos/types";

interface Props {
  videos: Video[];
}

function getPosterUrl(embedUrl: string): string | null {
  try {
    const url = new URL(embedUrl);

    if (
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtube-nocookie.com")
    ) {
      const id = url.pathname.match(/\/embed\/([^/]+)/)?.[1];
      return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
    }

    if (url.hostname === "player.vimeo.com") {
      const id = url.pathname.match(/\/video\/(\d+)/)?.[1];
      return id ? `https://vumbnail.com/${id}.jpg` : null;
    }
  } catch {
    return null;
  }

  return null;
}

/** Players only report playback state when the JS API is enabled. */
function withPlayerApi(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    if (
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtube-nocookie.com")
    ) {
      url.searchParams.set("enablejsapi", "1");
      return url.toString();
    }
  } catch {
    return embedUrl;
  }
  return embedUrl;
}

/**
 * Slide that mounts its iframe only once it scrolls near the viewport,
 * and keeps the provider thumbnail on top until the player reports that
 * it is actually playing — the iframe load event fires well before the
 * first video frame is painted.
 */
const VideoSlide = ({ video }: { video: Video }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);
  const posterUrl = getPosterUrl(video.embedUrl);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!load) return;

    const onMessage = (event: MessageEvent) => {
      if (
        !event.origin.includes("youtube.com") &&
        !event.origin.includes("youtube-nocookie.com") &&
        !event.origin.includes("vimeo.com")
      ) {
        return;
      }
      if (event.source !== frameRef.current?.contentWindow) return;

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // YouTube reports playerState 1 once playback has started.
        const ytPlaying = data?.info?.playerState === 1;
        const vimeoPlaying = data?.event === "play" || data?.event === "playing";

        if (ytPlaying || vimeoPlaying) setPlaying(true);
      } catch {
        /* Ignore unrelated messages from the player. */
      }
    };

    window.addEventListener("message", onMessage);

    // Ask the player to start reporting its state. The handshake is retried
    // because the player is not listening immediately after the iframe loads.
    const handshake = window.setInterval(() => {
      const frame = frameRef.current?.contentWindow;
      if (!frame) return;
      frame.postMessage(
        JSON.stringify({ event: "listening", channel: "widget" }),
        "*",
      );
      frame.postMessage(
        JSON.stringify({ method: "addEventListener", value: "play" }),
        "*",
      );
    }, 250);

    // Safety net: never leave the poster up if no event ever arrives.
    const fallback = window.setTimeout(() => setPlaying(true), 4000);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(handshake);
      window.clearTimeout(fallback);
    };
  }, [load]);

  useEffect(() => {
    if (!playing) return;
    const frame = frameRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(
      JSON.stringify({ event: "command", func: "stopListening" }),
      "*",
    );
  }, [playing]);

  return (
    <figure className="m-0">
      <div
        ref={ref}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#f3e8f7]"
      >
        {load && (
          <iframe
            ref={frameRef}
            src={withPlayerApi(video.embedUrl)}
            title={video.title || "Video"}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        {/* Stays on top until the first video frame is actually on screen. */}
        <div
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
            playing ? "opacity-0" : "opacity-100"
          }`}
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 78vw, (max-width: 768px) 46vw, (max-width: 1024px) 31vw, 25vw"
              className="object-cover"
              loading="lazy"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#fdf5ff] to-[#ead0f3]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/60 text-xl text-[#b718ec]">
                ▶
              </span>
            </div>
          )}
        </div>
      </div>
      {video.title && (
        <figcaption className="mt-2 text-center text-sm text-[#556987]">
          {video.title}
        </figcaption>
      )}
    </figure>
  );
};

const VideoCarousel = ({ videos }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  /**
   * Arrow state is derived from the raw scroll position rather than the
   * active index: the last slides can never align to the left edge, so an
   * index-based check would disable the arrows while scrolling is still
   * possible.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const sync = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      const cards = track.querySelectorAll<HTMLElement>("[data-slide]");

      setHasOverflow(maxScroll > 2);
      setAtStart(track.scrollLeft <= 2);
      setAtEnd(maxScroll > 2 && track.scrollLeft >= maxScroll - 2);

      if (maxScroll > 2 && track.scrollLeft >= maxScroll - 2) {
        setActive(cards.length - 1);
        return;
      }

      let closest = 0;
      let minDist = Infinity;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - track.scrollLeft);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      setActive(closest);
    };

    sync();
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      track.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [videos.length]);

  /** Scrolls by one slide relative to the current position. */
  const step = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    const cards = track.querySelectorAll<HTMLElement>("[data-slide]");
    if (!cards.length) return;

    const distance =
      cards.length > 1
        ? cards[1].offsetLeft - cards[0].offsetLeft
        : cards[0].offsetWidth;

    track.scrollBy({ left: direction * distance, behavior: "smooth" });
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.querySelectorAll<HTMLElement>("[data-slide]");
    const card = cards[Math.max(0, Math.min(index, cards.length - 1))];
    if (card) track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  }, []);

  if (!videos.length) return null;

  return (
    <section className="w-full py-16" id="videos">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#000D36] lg:text-3xl">
          Videos
        </h2>
        <p className="mt-1 text-sm text-[#556987]">
          Einblicke in unsere Arbeit — Shortvideos &amp; mehr.
        </p>
      </div>

      {/*
       * Slider track — vertical 9:16 slides.
       * Mobile: ~1.3 visible · Tablet: 2–3 · Desktop: 4
       */}
      <div
        ref={trackRef}
        className="relative flex gap-4 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((video, i) => (
          <div
            key={video.id}
            data-slide={i}
            className="w-[72%] flex-none [scroll-snap-align:start] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)]"
          >
            <VideoSlide video={video} />
          </div>
        ))}
      </div>

      {/* Navigation — pointless when every slide already fits. */}
      {hasOverflow && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label="Vorheriges Video"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F0E4F5] bg-white text-[#b718ec] shadow-sm transition duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ←
          </button>

          <div className="flex items-center gap-2">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                aria-label={`Zu Video ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  active === i
                    ? "w-6 bg-[#b718ec]"
                    : "w-2 bg-[#d8c7e0] hover:bg-[#b718ec]/50"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label="Nächstes Video"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F0E4F5] bg-white text-[#b718ec] shadow-sm transition duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </section>
  );
};

export default VideoCarousel;
