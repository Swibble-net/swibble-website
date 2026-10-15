import { useCallback, useEffect, useRef, useState } from "react";
import { IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import { checkerboard } from "@/lib/creators/layout";
import type { PublicCreator } from "@/lib/creators/types";

type Photo = PublicCreator["photos"][number];
type Video = PublicCreator["videos"][number];

const COLUMNS = 3;

/** Caption over the lower edge of a tile – from tablet width up, phones show the media only. */
const Caption = ({ text }: { text: string }) =>
  text ? (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-left text-sm font-semibold leading-tight text-white sm:block">
      {text}
    </span>
  ) : null;

/** Width / height of a tile; unknown sizes fall back to portrait. */
const ratio = (width: number, height: number, fallback: number) =>
  width > 0 && height > 0 ? width / height : fallback;

/**
 * Plays muted and looped while on screen, like the videos on the home page.
 * The cover shows until the video actually runs; the file is only requested
 * once the tile comes near the viewport.
 */
const InlineVideo = ({ video, active }: { video: Video; active: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const tile = ref.current;
    if (!tile) return;
    // Visitors who prefer reduced motion get the cover only.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          preload.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.35,
    });
    preload.observe(tile);
    visibility.observe(tile);
    return () => {
      preload.disconnect();
      visibility.disconnect();
    };
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !near) return;
    // React does not reliably reflect `muted`, and autoplay requires it.
    element.muted = true;
    if (visible && active) {
      element.play().catch(() => {
        /* Autoplay can be blocked (e.g. low-power mode); the cover stays. */
      });
    } else {
      element.pause();
    }
  }, [near, visible, active]);

  return (
    <div ref={ref} className="absolute inset-0">
      {video.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- cover of an own video
        <img src={video.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full bg-[#000D36]" />
      )}
      {near && (
        <video
          ref={videoRef}
          src={video.videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          aria-hidden
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
};

const arrowButton =
  "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25";

/**
 * Work of a creator: photos and videos in three staggered columns – photo,
 * video, photo / video, photo, video … row by row, each tile in its own
 * format. Videos play muted in place; a tile opens large (videos with sound).
 * Own files only — no third-party players.
 */
const CreatorWork = ({ photos, videos, name }: { photos: Photo[]; videos: Video[]; name: string }) => {
  const [open, setOpen] = useState<number | null>(null);
  const items = checkerboard(photos, videos, COLUMNS);
  const count = items.length;

  const step = useCallback(
    (by: number) => setOpen((current) => (current === null ? null : (current + by + count) % count)),
    [count],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  const current = open === null ? null : items[open];
  const caption = (entry: (typeof items)[number]) =>
    entry.kind === "photo" ? entry.item.caption : entry.item.title;

  const tile = (entry: (typeof items)[number], index: number) => {
    const text = caption(entry);
    const aspect =
      entry.kind === "photo"
        ? ratio(entry.item.width, entry.item.height, 3 / 4)
        : ratio(entry.item.width, entry.item.height, 9 / 16);
    return (
      <li key={`${entry.kind}-${entry.item.id}`}>
        <button
          type="button"
          onClick={() => setOpen(index)}
          aria-label={`${entry.kind === "video" ? "Video" : "Foto"}${text ? ` „${text}“` : ""} von ${name} öffnen`}
          style={{ aspectRatio: aspect }}
          className="group relative isolate block w-full overflow-hidden rounded-xl bg-[#FDF5FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] sm:rounded-2xl"
        >
          {entry.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element -- media route of the creator page
            <img
              src={entry.item.thumbUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 motion-safe:group-hover:scale-[1.02]"
            />
          ) : (
            <InlineVideo video={entry.item} active={open === null} />
          )}
          <Caption text={text} />
        </button>
      </li>
    );
  };

  return (
    <>
      {/* Row-major order split into columns: the pattern stays, the columns stagger. */}
      <div className="flex items-start gap-2 sm:gap-4">
        {Array.from({ length: COLUMNS }, (_, column) => (
          <ul key={column} className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-4">
            {items.map((entry, index) => (index % COLUMNS === column ? tile(entry, index) : null))}
          </ul>
        ))}
      </div>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${current.kind === "video" ? "Video" : "Foto"} ${open! + 1} von ${count}`}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          {current.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element -- media route of the creator page
            <img
              src={current.item.url}
              alt={current.item.caption || `Foto von ${name}`}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              key={current.item.id}
              src={current.item.videoUrl}
              poster={current.item.coverUrl || undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] max-w-full rounded-lg bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {caption(current) && <p className="text-sm font-medium text-white">{caption(current)}</p>}
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Schließen"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            <IoClose aria-hidden />
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Zurück"
                className={`${arrowButton} left-3`}
              >
                <IoChevronBack aria-hidden />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Weiter"
                className={`${arrowButton} right-3`}
              >
                <IoChevronForward aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default CreatorWork;
