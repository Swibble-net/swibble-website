import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import BlogCard from "@/components/blog/BlogCard";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  posts: BlogPost[];
}

const LatestPosts = ({ posts }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  /**
   * Track which slide is closest to the left edge of the scroll container.
   * Runs only on the client (inside useEffect) — SSR-safe.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const cards = track.querySelectorAll<HTMLElement>("[data-slide]");
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

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(`[data-slide="${index}"]`);
    if (card) track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  }, []);

  if (!posts.length) return null;

  return (
    <section className="w-full py-16">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#000D36] lg:text-3xl">
            Aus dem Blog
          </h2>
          <p className="mt-1 text-sm text-[#556987]">
            Einblicke, Tipps und Neuigkeiten aus der Swibble-Welt.
          </p>
        </div>
        <Link
          href="/blog"
          className="shrink-0 text-sm font-medium text-[#b718ec] transition-all duration-300 hover:tracking-[0.5px]"
        >
          Alle Beiträge →
        </Link>
      </div>

      {/*
       * Slider track
       *
       * Mobile  (<sm):  cards at 82% width → only 1 visible, peek of next
       * Tablet  (sm):   cards at calc(50%-12px) → 2 visible, 3rd peeks
       * Desktop (lg):   cards flex-1 → all 3 fill the row, no scroll needed
       *
       * scroll-snap is disabled at lg via [scroll-snap-type:none] so
       * there is no snapping conflict when all cards are in view.
       */}
      <div
        ref={trackRef}
        className="relative flex gap-6 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory] lg:[scroll-snap-type:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post, i) => (
          <div
            key={post.id}
            data-slide={i}
            className="w-[82%] flex-none sm:w-[calc(50%-12px)] lg:flex-1 [scroll-snap-align:start] lg:[scroll-snap-align:none]"
          >
            <BlogCard post={post} />
          </div>
        ))}
      </div>

      {/*
       * Navigation — hidden on lg because all cards are visible at once.
       * Shows prev/next arrow buttons flanking animated dot indicators.
       */}
      <div className="mt-5 flex items-center justify-center gap-4 lg:hidden">
        <button
          onClick={() => scrollToIndex(active - 1)}
          disabled={active === 0}
          aria-label="Vorheriger Beitrag"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F0E4F5] bg-white text-[#b718ec] shadow-sm transition duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ←
        </button>

        <div className="flex items-center gap-2">
          {posts.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              aria-label={`Zu Beitrag ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                active === i
                  ? "w-6 bg-[#b718ec]"
                  : "w-2 bg-[#d8c7e0] hover:bg-[#b718ec]/50"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => scrollToIndex(active + 1)}
          disabled={active === posts.length - 1}
          aria-label="Nächster Beitrag"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F0E4F5] bg-white text-[#b718ec] shadow-sm transition duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          →
        </button>
      </div>
    </section>
  );
};

export default LatestPosts;
