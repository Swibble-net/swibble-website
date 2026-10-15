import { useCallback, useEffect, useState } from "react";
import { IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";
import type { PublicCreator } from "@/lib/creators/types";

type Photo = PublicCreator["photos"][number];

/** Photo grid; a tap opens the large version (arrows / swipe-free buttons, Esc). */
const PhotoGallery = ({ photos, name }: { photos: Photo[]; name: string }) => {
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (by: number) =>
      setOpen((current) =>
        current === null ? null : (current + by + photos.length) % photos.length,
      ),
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
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`Foto ${index + 1} von ${name} vergrößern`}
              className="block w-full overflow-hidden rounded-xl bg-[#FDF5FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- media route of the creator page */}
              <img src={photo.thumbUrl} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${open! + 1} von ${photos.length}`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- media route of the creator page */}
          <img
            src={current.url}
            alt={`Foto von ${name}`}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
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

export default PhotoGallery;
