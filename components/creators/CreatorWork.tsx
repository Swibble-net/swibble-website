import { useCallback, useEffect, useState } from "react";
import { IoChevronBack, IoChevronForward, IoClose, IoPlay } from "react-icons/io5";
import { checkerboard } from "@/lib/creators/layout";
import type { PublicCreator } from "@/lib/creators/types";

type Photo = PublicCreator["photos"][number];
type Video = PublicCreator["videos"][number];

/** Caption over the lower edge of a tile. */
const Caption = ({ text }: { text: string }) =>
  text ? (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8 text-left text-[11px] font-semibold leading-tight text-white sm:px-3 sm:pb-2.5 sm:text-sm">
      {text}
    </span>
  ) : null;

const arrowButton =
  "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25";

/**
 * Work of a creator: photos and videos in a three-column grid – photo,
 * video, photo / video, photo, video – each with its caption (customer /
 * project). A tile opens large; videos play there. Own files only — no
 * third-party players.
 */
const CreatorWork = ({ photos, videos, name }: { photos: Photo[]; videos: Video[]; name: string }) => {
  const [open, setOpen] = useState<number | null>(null);
  const items = checkerboard(photos, videos);
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

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:gap-4">
        {items.map((entry, index) => {
          const text = caption(entry);
          return (
            <li key={`${entry.kind}-${entry.item.id}`}>
              <button
                type="button"
                onClick={() => setOpen(index)}
                aria-label={`${entry.kind === "video" ? "Video" : "Foto"}${text ? ` „${text}“` : ""} von ${name} öffnen`}
                className="group relative isolate block aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#FDF5FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] sm:rounded-2xl"
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
                  <>
                    {entry.item.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- cover of an own video
                      <img src={entry.item.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="block h-full w-full bg-[#000D36]" />
                    )}
                    <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-[#B718EC] shadow-lg transition motion-safe:group-hover:scale-105 sm:h-14 sm:w-14 sm:text-2xl">
                      <IoPlay aria-hidden className="ml-0.5 sm:ml-1" />
                    </span>
                  </>
                )}
                <Caption text={text} />
              </button>
            </li>
          );
        })}
      </ul>

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
