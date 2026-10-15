import { useCallback, useEffect, useState } from "react";
import { IoChevronBack, IoChevronForward, IoClose, IoPlay } from "react-icons/io5";
import type { PublicCreator } from "@/lib/creators/types";

type Photo = PublicCreator["photos"][number];
type Video = PublicCreator["videos"][number];

type Item =
  | { kind: "video"; id: string; caption: string; video: Video }
  | { kind: "photo"; id: string; caption: string; photo: Photo; photoIndex: number };

/** Caption over the lower edge of a tile. */
const Caption = ({ text }: { text: string }) =>
  text ? (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-left text-xs font-semibold text-white sm:text-sm">
      {text}
    </span>
  ) : null;

/**
 * Work of a creator: videos and photos in one mosaic, each with its caption
 * (customer / project). Photos open large, videos play in place. Own files
 * only — no third-party players.
 */
const CreatorWork = ({ photos, videos, name }: { photos: Photo[]; videos: Video[]; name: string }) => {
  const [playing, setPlaying] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const items: Item[] = [
    ...videos.map((video) => ({ kind: "video" as const, id: video.id, caption: video.title, video })),
    ...photos.map((photo, photoIndex) => ({
      kind: "photo" as const,
      id: photo.id,
      caption: photo.caption,
      photo,
      photoIndex,
    })),
  ];

  const step = useCallback(
    (by: number) =>
      setOpen((current) => (current === null ? null : (current + by + photos.length) % photos.length)),
    [photos.length],
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

  const current = open === null ? null : photos[open];

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="mb-3 break-inside-avoid sm:mb-4">
            {item.kind === "video" ? (
              <div
                className={`relative overflow-hidden rounded-2xl bg-[#000D36] ${
                  item.video.width > item.video.height ? "aspect-video" : "aspect-[9/16]"
                }`}
              >
                {playing === item.id ? (
                  <video
                    src={item.video.videoUrl}
                    poster={item.video.coverUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlaying(item.id)}
                    aria-label={`Video${item.caption ? ` „${item.caption}“` : ""} abspielen`}
                    className="group block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
                  >
                    {item.video.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- cover of an own video
                      <img src={item.video.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-[#B718EC] shadow-lg transition motion-safe:group-hover:scale-105">
                      <IoPlay aria-hidden className="ml-1" />
                    </span>
                    <Caption text={item.caption} />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(item.photoIndex)}
                aria-label={`Foto${item.caption ? ` „${item.caption}“` : ""} von ${name} vergrößern`}
                className="group relative block w-full overflow-hidden rounded-2xl bg-[#FDF5FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- media route of the creator page */}
                <img
                  src={item.photo.thumbUrl}
                  alt=""
                  loading="lazy"
                  width={item.photo.width || undefined}
                  height={item.photo.height || undefined}
                  className="h-auto w-full transition duration-300 motion-safe:group-hover:scale-[1.02]"
                />
                <Caption text={item.caption} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${open! + 1} von ${photos.length}`}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- media route of the creator page */}
          <img
            src={current.url}
            alt={current.caption || `Foto von ${name}`}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {current.caption && <p className="text-sm font-medium text-white">{current.caption}</p>}
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Schließen"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
          >
            <IoClose aria-hidden />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Vorheriges Foto"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
              >
                <IoChevronBack aria-hidden />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Nächstes Foto"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
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
