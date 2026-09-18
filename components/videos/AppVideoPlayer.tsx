import { useEffect, useRef, useState } from "react";
import type { Video } from "@/lib/videos/types";

interface Props {
  video: Video;
  /** Whether the sound toggle is offered at all (CMS setting + audio track). */
  soundAllowed: boolean;
  muted: boolean;
  onToggleSound: () => void;
  onHidden: () => void;
}

const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
    {muted ? (
      <>
        <path d="m16 9 5 6" />
        <path d="m21 9-5 6" />
      </>
    ) : (
      <>
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </>
    )}
  </svg>
);

/**
 * Compressed MP4 from the Swibble app. The cover is visible immediately; the
 * video only starts downloading when the slide approaches the viewport and
 * fades in once it can actually play. Off-screen videos pause.
 */
const AppVideoPlayer = ({
  video,
  soundAllowed,
  muted,
  onToggleSound,
  onHidden,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onHiddenRef = useRef(onHidden);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    onHiddenRef.current = onHidden;
  }, [onHidden]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          preload.disconnect();
        }
      },
      { rootMargin: "200px 100px", threshold: 0.01 },
    );
    const visibility = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (!entry.isIntersecting) onHiddenRef.current();
      },
      { threshold: 0.35 },
    );

    preload.observe(container);
    visibility.observe(container);
    return () => {
      preload.disconnect();
      visibility.disconnect();
    };
  }, []);

  // React does not reliably reflect `muted` to the element, and autoplay requires
  // it. Browsers may pause a video whose sound changes, so playback is resumed
  // whenever the slide is on screen.
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !near) return;
    element.muted = muted;
    if (visible) {
      element.play().catch(() => {
        /* Autoplay can be blocked (e.g. low-power mode); the cover stays visible. */
      });
    } else {
      element.pause();
    }
  }, [muted, visible, near]);

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#f3e8f7] bg-cover bg-center"
      style={
        video.coverUrl
          ? { backgroundImage: `url("${video.coverUrl}")` }
          : undefined
      }
    >
      {near && (
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.coverUrl || undefined}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          aria-label={
            video.accountName ? `Video für ${video.accountName}` : "Video"
          }
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {soundAllowed && (
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={!muted}
          aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}
          className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition duration-200 hover:scale-105 hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
            muted ? "opacity-0" : "opacity-100"
          }`}
        >
          <SpeakerIcon muted={muted} />
        </button>
      )}
    </div>
  );
};

export default AppVideoPlayer;
