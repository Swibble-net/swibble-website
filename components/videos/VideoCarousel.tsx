import { useRef, useState, useEffect, useCallback } from "react";
import type { Video } from "@/lib/videos/types";
import { silenceIfHidden, toggleUnmuted } from "@/lib/videos/sound";
import { isTikTokEmbed } from "@/lib/videos/embed";
import AppVideoPlayer from "./AppVideoPlayer";
import VideoCover from "./VideoCover";

interface Props {
  videos: Video[];
  /** CMS setting: visitors may switch on sound for self-hosted videos. */
  soundEnabled?: boolean;
}

interface SlideProps {
  video: Video;
  soundAllowed: boolean;
  muted: boolean;
  onToggleSound: () => void;
  onHidden: () => void;
}

const localVimeoCovers = new Set([
  "1054152491",
  "1068580256",
  "1068582382",
  "1093776495",
  "1093778916",
  "1093792745",
  "1093797196",
  "1141495834",
  "1141659404",
  "1208426258",
  "1208426259",
  "1208426261",
]);

function getCoverPath(video: Video): string {
  if (video.coverPath) return video.coverPath;

  try {
    const url = new URL(video.embedUrl);
    const id = url.pathname.match(/\/video\/(\d+)/)?.[1];
    if (id && localVimeoCovers.has(id)) {
      return `/video-covers/vimeo-${id}.jpg`;
    }
  } catch {
    return "";
  }

  return "";
}

const Caption = ({ title }: { title: string }) =>
  title ? (
    <figcaption className="mt-2 text-center text-sm text-[#556987]">
      {title}
    </figcaption>
  ) : null;

const VideoSlide = (props: SlideProps) =>
  props.video.source === "app" ? (
    <figure className="m-0">
      <AppVideoPlayer {...props} />
      {/* Titles of self-hosted videos are file names; visitors see the customer instead. */}
      <Caption title={props.video.accountName} />
    </figure>
  ) : (
    <EmbedSlide video={props.video} />
  );

/**
 * Autoplays as the slide approaches the viewport. Off-screen slides remain
 * lightweight until visitors scroll to them.
 */
const EmbedSlide = ({ video }: { video: Video }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const coverPath = getCoverPath(video);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const tiktok = isTikTokEmbed(video.embedUrl);

  // TikTok's player has no "muted" URL option: silence it as soon as it reports ready
  // (and again on every state change, in case the browser allowed autoplay with sound).
  useEffect(() => {
    if (!tiktok || !started) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.tiktok.com") return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; "x-tiktok-player"?: boolean };
      if (!data?.["x-tiktok-player"]) return;
      if (data.type === "onPlayerReady" || data.type === "onStateChange") {
        frameRef.current?.contentWindow?.postMessage(
          { type: "mute", "x-tiktok-player": true },
          "https://www.tiktok.com",
        );
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [tiktok, started]);

  useEffect(() => {
    const slide = ref.current;
    if (!slide) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 100px", threshold: 0.01 },
    );

    observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="m-0">
      <div
        ref={ref}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#f3e8f7]"
      >
        <VideoCover src={coverPath} />
        {started && (
          <iframe
            ref={frameRef}
            src={video.embedUrl}
            title={
              video.accountName ? `Video für ${video.accountName}` : "Video"
            }
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      <Caption title={video.accountName || video.title} />
    </figure>
  );
};

function getSnapPoints(track: HTMLDivElement): number[] {
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
  const cards = track.querySelectorAll<HTMLElement>("[data-slide]");
  const points: number[] = [];

  cards.forEach((card) => {
    const point = Math.min(card.offsetLeft, maxScroll);
    const previous = points.at(-1);
    if (previous === undefined || Math.abs(previous - point) > 2) {
      points.push(point);
    }
  });

  return points;
}

const VideoCarousel = ({ videos, soundEnabled = false }: Props) => {
  const [unmutedId, setUnmutedId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [snapPoints, setSnapPoints] = useState<number[]>([]);
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
      const points = getSnapPoints(track);

      setHasOverflow(maxScroll > 2);
      setAtStart(track.scrollLeft <= 2);
      setAtEnd(maxScroll > 2 && track.scrollLeft >= maxScroll - 2);
      setSnapPoints((current) =>
        current.length === points.length &&
        current.every((point, index) => Math.abs(point - points[index]) <= 2)
          ? current
          : points,
      );

      let closest = 0;
      let minDist = Infinity;
      points.forEach((point, i) => {
        const dist = Math.abs(point - track.scrollLeft);
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

    const points = getSnapPoints(track);
    const candidates =
      direction === 1 ? points : [...points].reverse();
    const target = candidates.find((point) =>
      direction === 1
        ? point > track.scrollLeft + 2
        : point < track.scrollLeft - 2,
    );

    if (target !== undefined) {
      track.scrollTo({ left: target, behavior: "smooth" });
    }
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const point = snapPoints[index];
      if (track && point !== undefined) {
        track.scrollTo({ left: point, behavior: "smooth" });
      }
    },
    [snapPoints],
  );

  if (!videos.length) return null;

  return (
    // scroll-mt: the fixed header would cover the title after a jump to #videos.
    // 4rem + this section's own 4rem top padding puts the title where the other
    // sections land (8rem), just below the header.
    <section className="w-full scroll-mt-16 py-16" id="videos">
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
            <VideoSlide
              video={video}
              soundAllowed={soundEnabled && video.hasAudio}
              muted={!soundEnabled || unmutedId !== video.id}
              onToggleSound={() =>
                setUnmutedId((current) => toggleUnmuted(current, video.id))
              }
              onHidden={() =>
                setUnmutedId((current) => silenceIfHidden(current, video.id))
              }
            />
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

          {/* 24px hit area per dot (touch target size); the visible dot stays small. */}
          <div className="flex items-center">
            {snapPoints.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                aria-label={`Zu Videoposition ${i + 1}`}
                className="group flex h-6 min-w-6 items-center justify-center px-1"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    active === i
                      ? "w-6 bg-[#b718ec]"
                      : "w-2 bg-[#d8c7e0] group-hover:bg-[#b718ec]/50"
                  }`}
                />
              </button>
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
