import { useCallback, useEffect, useRef, useState } from "react";
import { IoChevronBack, IoChevronForward, IoClose, IoDownloadOutline, IoExpand } from "react-icons/io5";
import type { PitchDeckPage } from "@/lib/pitchdecks/types";

interface Props {
  pages: PitchDeckPage[];
  pageUrl: (index: number) => string;
  downloadUrl: string;
  startIndex: number;
  onClose: () => void;
}

/** Full-screen slide view: arrow keys, swipe, Esc. */
const SlidePresenter = ({ pages, pageUrl, downloadUrl, startIndex, onClose }: Props) => {
  const [index, setIndex] = useState(startIndex);
  const root = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const last = pages.length - 1;

  const go = useCallback(
    (next: number) => setIndex(Math.max(0, Math.min(last, next))),
    [last],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!document.fullscreenElement) onClose();
      } else if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.min(last, i + 1));
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(last);
      }
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    root.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [last, onClose]);

  // Neighbours load in the background so flipping feels instant.
  useEffect(() => {
    for (const i of [index + 1, index - 1, index + 2]) {
      if (i >= 0 && i <= last) new Image().src = pageUrl(i);
    }
  }, [index, last, pageUrl]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else root.current?.requestFullscreen().catch(() => undefined);
  };

  const page = pages[index];
  const buttonClass =
    "flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white";

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Präsentation"
      className="fixed inset-0 z-50 flex flex-col bg-[#0B0612] outline-none"
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 text-sm text-white/70">
        <span className="pl-2 tabular-nums" aria-live="polite">
          {index + 1} / {pages.length}
        </span>
        <div className="flex items-center gap-1">
          <a href={downloadUrl} className={buttonClass} aria-label="PDF herunterladen" title="PDF herunterladen">
            <IoDownloadOutline size={20} />
          </a>
          {typeof document !== "undefined" && document.fullscreenEnabled && (
            <button type="button" onClick={toggleFullscreen} className={buttonClass} aria-label="Vollbild" title="Vollbild">
              <IoExpand size={19} />
            </button>
          )}
          <button type="button" onClick={onClose} className={buttonClass} aria-label="Schließen" title="Schließen (Esc)">
            <IoClose size={24} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our API, sizes known */}
        <img
          key={index}
          src={pageUrl(index)}
          width={page.width}
          height={page.height}
          alt={`Folie ${index + 1}`}
          className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
          onClick={() => go(index + 1)}
        />
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className={`${buttonClass} absolute left-2 top-1/2 hidden -translate-y-1/2 disabled:opacity-20 sm:flex`}
          aria-label="Vorherige Folie"
        >
          <IoChevronBack size={26} />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === last}
          className={`${buttonClass} absolute right-2 top-1/2 hidden -translate-y-1/2 disabled:opacity-20 sm:flex`}
          aria-label="Nächste Folie"
        >
          <IoChevronForward size={26} />
        </button>
      </div>
    </div>
  );
};

export default SlidePresenter;
