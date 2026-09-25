import { useCallback, useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import styles from "@/styles/projects.module.scss";
import SwibbleImage from "@/public/projects_photo/Swibble_Image.webp";
import AquisImage from "@/public/projects_photo/Aquis_Image.webp";
import OlympiaImage from "@/public/projects_photo/Olympia_Image.webp";
import BillstedtImage from "@/public/projects_photo/Billstedt_Image.webp";
import MyZeilImage from "@/public/projects_photo/Myzeil_Image.webp";
import RushfoodImage from "@/public/projects_photo/Rushfood_Image.webp";
import LittleWorldImage from "@/public/projects_photo/LittleWorld_Image.webp";
import AachenAppImage from "@/public/projects_photo/AachenApp_Image.webp";
import RydeUpImage from "@/public/projects_photo/RydeUp_Image.webp";
import SquareImage from "@/public/projects_photo/Square_Image.webp";
import KonratsWeltImage from "@/public/projects_photo/KonratsWelt_Image.webp";
import LogoMark from "@/public/favicon.svg";

interface Tile {
  kicker: string;
  title: string;
  image?: StaticImageData;
  href?: string;
  /** Shown on hover for linked tiles */
  cta?: string;
  /** Phone mockups keep their upper part (the faces) visible when cropped. */
  mockup?: boolean;
}

// Each column stacks two tiles; tall/short alternate so the grid keeps its staggered look.
const COLUMNS: [Tile, Tile][] = [
  [
    { kicker: "Dein Projekt", title: "Starte mit Swibble!", image: SwibbleImage, href: "/#kontakt", cta: "Jetzt starten" },
    { kicker: "Social Media & Events", title: "Aquis Plaza", image: AquisImage, mockup: true, href: "/blog/case-study-aquis-plaza-aachen", cta: "Case Study lesen" },
  ],
  [
    { kicker: "Social Media", title: "Olympia Einkaufszentrum", image: OlympiaImage, mockup: true, href: "/blog/case-study-olympia-einkaufszentrum-munchen", cta: "Case Study lesen" },
    { kicker: "Social Media", title: "Billstedt Center", image: BillstedtImage, mockup: true, href: "/blog/case-study-billstedt-center-hamburg", cta: "Case Study lesen" },
  ],
  [
    { kicker: "Social Media", title: "MyZeil", image: MyZeilImage, mockup: true, href: "/blog/case-study-myzeil-frankfurt", cta: "Case Study lesen" },
    { kicker: "Social Media", title: "Rushfood", image: RushfoodImage, mockup: true, href: "/blog/case-study-rushfood-aachen", cta: "Case Study lesen" },
  ],
  [
    { kicker: "Web App", title: "Little World", image: LittleWorldImage },
    { kicker: "App & Website", title: "Aachen App", image: AachenAppImage },
  ],
  [
    { kicker: "App", title: "RydeUp", image: RydeUpImage },
    { kicker: "Qualitätssicherung", title: "Square", image: SquareImage },
  ],
  [
    { kicker: "App & Web-App", title: "Konrat’s Welt", image: KonratsWeltImage },
    { kicker: "Noch mehr Einblicke", title: "Alle Case Studies\nim Blog", href: "/blog", cta: "Zum Blog" },
  ],
];

// Miniature "article" for the closing tile; the cover colours are the clients' brand colours.
const ARTICLE_CARDS = [
  {
    cover: "linear-gradient(135deg,#F47807,#FDBA4D)",
    className:
      "left-[4%] z-10 -rotate-[10deg] bg-white/55 group-hover:-translate-x-[6%] group-hover:-rotate-[15deg]",
  },
  {
    cover: "linear-gradient(135deg,#E2000F,#FF6B81)",
    className:
      "right-[4%] z-10 rotate-[10deg] bg-white/55 group-hover:translate-x-[6%] group-hover:rotate-[15deg]",
  },
  {
    cover: "linear-gradient(135deg,#2F3192,#6E7BF2)",
    className:
      "left-1/2 z-20 -translate-x-1/2 bg-white shadow-[0_18px_40px_rgba(27,11,74,0.45)] group-hover:-translate-y-[7%]",
  },
] as const;

// Decorative background of the tile that has no photo: layered gradient, the logo
// as a watermark and a fanned stack of article cards. Pure CSS/SVG, so it stays
// crisp at any size and needs no extra request.
const BlogTileArt = () => (
  <span className="absolute inset-0 overflow-hidden" aria-hidden>
    <span className="absolute inset-0 bg-[linear-gradient(160deg,#2A0B5E_0%,#8A1FD6_48%,#5F3BC4_100%)]" />
    <span className="absolute -left-[30%] top-[18%] h-[70%] w-[110%] rounded-full bg-[radial-gradient(closest-side,rgba(231,161,255,0.55),transparent)] blur-2xl" />
    <Image
      src={LogoMark}
      alt=""
      unoptimized
      className="absolute -right-[22%] top-[14%] h-auto w-[95%] max-w-none rotate-[8deg] opacity-[0.13] brightness-0 invert transition-transform duration-700 group-hover:rotate-[2deg] group-hover:scale-105"
    />
    <span className="absolute inset-x-0 bottom-[-6%] h-[52%]">
      {ARTICLE_CARDS.map(({ cover, className }) => (
        <span
          key={cover}
          className={`absolute bottom-0 flex aspect-[3/4] w-[46%] flex-col gap-[7%] rounded-[10%/7.5%] p-[5%] backdrop-blur-sm transition-transform duration-500 ease-out ${className}`}
        >
          <span
            className="block h-[42%] w-full rounded-[8%/14%]"
            style={{ backgroundImage: cover }}
          />
          <span className="block h-[5%] w-[85%] rounded-full bg-[#000D36]/70" />
          <span className="block h-[5%] w-[60%] rounded-full bg-[#000D36]/25" />
          <span className="mt-auto block h-[5%] w-[38%] rounded-full bg-[#B718EC]" />
        </span>
      ))}
    </span>
  </span>
);

const TALL = "h-[16.25rem] lg:h-[26rem]";
const SHORT = "h-[12.5rem] lg:h-[19rem]";

const ProjectTile = ({ tile, tall, priority }: { tile: Tile; tall: boolean; priority: boolean }) => {
  const content = (
    <>
      {tile.image ? (
        <Image
          src={tile.image}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 25vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            tile.mockup && !tall ? "object-[50%_22%]" : ""
          }`}
        />
      ) : (
        <BlogTileArt />
      )}
      {/* Scrim keeps the white text readable on any photo. */}
      <span
        className={`absolute inset-x-0 h-1/2 ${
          tall
            ? "top-0 bg-gradient-to-b from-black/55 to-transparent"
            : "bottom-0 bg-gradient-to-t from-black/60 to-transparent"
        }`}
        aria-hidden
      />
      <div
        className={`absolute inset-x-0 flex flex-col px-2.5 text-left text-white lg:px-4 ${
          tall ? "top-0 pt-[0.938rem] lg:pt-5" : "bottom-0 pb-[0.938rem] lg:pb-5"
        }`}
      >
        <p className="text-sm font-normal leading-[1.313rem] lg:text-base lg:leading-7">
          {tile.kicker}
        </p>
        <h3 className="whitespace-pre-line text-lg font-semibold leading-[1.688rem] lg:text-2xl lg:font-medium lg:leading-8">
          {tile.title}
        </h3>
        {tile.cta && !tile.image && (
          <span className="mt-2 w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-[#8A1FD6] shadow-sm transition duration-300 group-hover:translate-x-1 lg:mt-3 lg:px-4 lg:py-1.5 lg:text-sm">
            {tile.cta} →
          </span>
        )}
        {tile.cta && tile.image && (
          <span className="mt-1 text-xs font-medium opacity-0 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100 lg:text-sm">
            {tile.cta} →
          </span>
        )}
      </div>
    </>
  );

  const className = `group relative block w-full overflow-hidden rounded-[0.625rem] bg-[#f3e8f7] ${tall ? TALL : SHORT}`;

  return tile.href ? (
    <Link
      href={tile.href}
      className={`${className} transition-transform duration-200 hover:scale-[0.98]`}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

const Projects = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      setAtStart(track.scrollLeft <= 2);
      setAtEnd(max <= 2 || track.scrollLeft >= max - 2);
    };
    sync();
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      track.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  /** Scrolls by one column. */
  const step = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    const column = track?.querySelector<HTMLElement>("[data-column]");
    if (!track || !column) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (column.offsetWidth + gap), behavior: "smooth" });
  }, []);

  return (
    <section id="portfolio" className="scroll-mt-28 lg:scroll-mt-32">
      <div className={styles.description}>
        <div className={styles.text_description}>
          <h2>Hier könnte dein Projekt stehen</h2>
          <br />
          <p>
            Viele Unternehmen vertrauen Swibble bereits! Klicke dich einfach
            durch ein paar unserer Lieblingsprojekte durch und lass dich
            inspirieren.
          </p>
        </div>
        <div className="hidden shrink-0 gap-3 lg:flex">
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => step(direction)}
              disabled={direction === -1 ? atStart : atEnd}
              aria-label={direction === -1 ? "Vorherige Projekte" : "Weitere Projekte"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F0E4F5] bg-white text-[#b718ec] shadow-sm transition duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {direction === -1 ? "←" : "→"}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal track — mobile ~2 columns · tablet 3 · desktop 4 */}
      <div
        ref={trackRef}
        role="list"
        aria-label="Projekte"
        className="-mx-4 mt-12 mb-12 flex gap-4 overflow-x-auto px-4 pb-2 [scroll-padding-inline:1rem] [scroll-snap-type:x_mandatory] [scrollbar-width:none] lg:mx-0 lg:gap-6 lg:px-0 lg:[scroll-padding-inline:0] [&::-webkit-scrollbar]:hidden"
      >
        {COLUMNS.map((column, i) => (
          <div
            key={column[0].title}
            data-column
            className="flex w-[46%] flex-none flex-col gap-4 [scroll-snap-align:start] sm:w-[31%] lg:w-[calc(25%-1.125rem)] lg:gap-6"
          >
            {column.map((tile, j) => (
              <div role="listitem" key={tile.title}>
                {/* Even columns start tall, odd columns start short. */}
                <ProjectTile tile={tile} tall={(i + j) % 2 === 0} priority={false} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Projects;
