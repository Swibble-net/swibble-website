import { useRef, type CSSProperties, type ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  LuAperture,
  LuBookmark,
  LuCamera,
  LuHeart,
  LuMessageCircle,
  LuMousePointer2,
  LuPenTool,
  LuPlay,
  LuRotate3D,
  LuSend,
  LuShieldCheck,
  LuStore,
} from "react-icons/lu";
import Image from "next/image";
import HeroVisual, { SHAPES } from "@/components/HeroVisual";
import GermanyMap from "@/public/map_germany.webp";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import styles from "@/styles/landing.module.scss";
import type { LandingVisualKey } from "@/lib/landing/types";

/** Parallax depth of a layer: negative = far (moves against the cursor), positive = near. */
const depth = (value: number) => ({ "--depth": value }) as CSSProperties;

const Shape = ({ name, d }: { name: keyof typeof SHAPES; d: number }) => (
  <div className={`absolute inset-0 ${styles.float}`} style={depth(d)}>
    <svg className={styles.shape} viewBox="0 0 590 596">
      <path fill={SHAPES[name].fill} d={SHAPES[name].d} />
    </svg>
  </div>
);

const Chip = ({
  children,
  icon: Icon,
  color = "#B718EC",
  className,
  d,
}: {
  children: ReactNode;
  icon?: IconType;
  color?: string;
  className: string;
  d: number;
}) => (
  <div className={`absolute ${className} ${styles.float}`} style={depth(d)}>
    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[0.7rem] font-medium text-[#000D36] shadow-[0_10px_30px_rgba(0,13,54,0.18)] sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
      {Icon ? (
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color }} />
      ) : (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {children}
    </span>
  </div>
);

const Bubble = ({
  icon: Icon,
  background,
  className,
  d,
}: {
  icon: IconType;
  background: string;
  className: string;
  d: number;
}) => (
  <div className={`absolute ${className} ${styles.float}`} style={depth(d)}>
    <span
      className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_12px_30px_rgba(0,13,54,0.25)] sm:h-14 sm:w-14"
      style={{ background }}
    >
      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
    </span>
  </div>
);

/** Stylised phone showing a short-form video; `screen` is the gradient of the "video". */
const Phone = ({
  screen,
  className,
  d,
}: {
  screen: string;
  className: string;
  d: number;
}) => (
  <div className={`absolute ${className} ${styles.float}`} style={depth(d)}>
    <div className="h-full w-full rounded-[clamp(1.2rem,4vw,2rem)] bg-[#0B0B1A] p-[3.5%] shadow-[0_30px_60px_rgba(0,13,54,0.45)]">
      <div
        className="relative h-full w-full overflow-hidden rounded-[clamp(1rem,3.4vw,1.7rem)]"
        style={{ background: screen }}
      >
        <span className="absolute left-1/2 top-[2.5%] h-[3.2%] w-[32%] -translate-x-1/2 rounded-full bg-[#0B0B1A]" />
        <span className="absolute -left-[20%] top-[22%] h-[45%] w-[90%] rounded-full bg-white/25 blur-2xl" />
        <span className="absolute left-1/2 top-1/2 flex h-[15%] aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
          <LuPlay className="h-1/2 w-1/2 translate-x-[6%] fill-white text-white" />
        </span>
        {/* Action column of a short-video app */}
        <span className="absolute bottom-[14%] right-[6%] flex w-[13%] flex-col items-center gap-[0.6em] text-white">
          <span className="aspect-square w-full rounded-full border-2 border-white bg-[#E7A1FF]" />
          <LuHeart className="h-auto w-[85%] fill-[#FF4F8B] text-[#FF4F8B]" />
          <LuMessageCircle className="h-auto w-[85%]" />
          <LuBookmark className="h-auto w-[85%]" />
          <LuSend className="h-auto w-[85%]" />
        </span>
        {/* Caption */}
        <span className="absolute bottom-[6%] left-[7%] flex w-[58%] flex-col gap-[0.35em]">
          <span className="h-[0.45em] w-[55%] rounded-full bg-white" />
          <span className="h-[0.4em] w-full rounded-full bg-white/70" />
          <span className="h-[0.4em] w-[70%] rounded-full bg-white/70" />
        </span>
      </div>
    </div>
  </div>
);

const SocialVisual = () => (
  <>
    <Phone
      d={4}
      screen="linear-gradient(165deg,#FFB86B 0%,#FF5FA2 38%,#B718EC 72%,#2A0B5E 100%)"
      className="left-[31%] top-[5%] h-[90%] w-[38%] -rotate-6"
    />
    <Chip d={14} className="left-[2%] top-[20%]" color="#C43B7D">
      Reels
    </Chip>
    <Chip d={20} className="right-[1%] top-[36%]" color="#000D36">
      TikTok
    </Chip>
    <Chip d={10} className="left-[5%] bottom-[24%]" color="#E2000F">
      Shorts
    </Chip>
    <Bubble
      d={24}
      icon={LuHeart}
      background="linear-gradient(135deg,#FF4F8B,#C43B7D)"
      className="right-[14%] top-[10%]"
    />
    {/* Editorial plan: a small calendar with the publishing days marked */}
    <div
      className={`absolute bottom-[8%] right-[3%] w-[30%] ${styles.float}`}
      style={depth(16)}
    >
      <div className="rounded-2xl bg-white p-2.5 shadow-[0_14px_40px_rgba(0,13,54,0.2)] sm:p-3">
        <span className="mb-2 block h-1.5 w-1/2 rounded-full bg-[#000D36]" />
        <span className="grid grid-cols-5 gap-1">
          {Array.from({ length: 15 }, (_, i) => (
            <span
              key={i}
              className={`aspect-square rounded-[3px] ${
                [1, 4, 7, 10, 13].includes(i) ? "bg-[#B718EC]" : "bg-[#F0E4F5]"
              }`}
            />
          ))}
        </span>
      </div>
    </div>
  </>
);

const DesignVisual = () => (
  <>
    {/* App window with a skeleton layout */}
    <div
      className={`absolute left-[12%] top-[20%] w-[72%] -rotate-3 ${styles.float}`}
      style={depth(4)}
    >
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_rgba(0,13,54,0.35)]">
        <span className="flex gap-1.5 border-b border-[#F0E4F5] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#FF6B81]" />
          <span className="h-2 w-2 rounded-full bg-[#FDBA4D]" />
          <span className="h-2 w-2 rounded-full bg-[#3ABD9E]" />
        </span>
        <span className="flex gap-3 p-3">
          <span className="flex w-1/5 flex-col gap-2">
            <span className="h-2 rounded-full bg-[#B718EC]" />
            <span className="h-2 rounded-full bg-[#F0E4F5]" />
            <span className="h-2 rounded-full bg-[#F0E4F5]" />
            <span className="h-2 w-2/3 rounded-full bg-[#F0E4F5]" />
          </span>
          <span className="flex flex-1 flex-col gap-2">
            <span className="block aspect-[16/6] rounded-lg bg-[linear-gradient(120deg,#E7A1FF,#B718EC_55%,#5F3BC4)]" />
            <span className="grid grid-cols-3 gap-2">
              <span className="aspect-square rounded-lg bg-[#FDF5FF]" />
              <span className="aspect-square rounded-lg bg-[#FDF5FF]" />
              <span className="aspect-square rounded-lg bg-[#FDF5FF]" />
            </span>
            <span className="h-2 w-3/4 rounded-full bg-[#F0E4F5]" />
          </span>
        </span>
      </div>
    </div>
    {/* Colour palette */}
    <div
      className={`absolute bottom-[10%] left-[3%] ${styles.float}`}
      style={depth(16)}
    >
      <span className="flex gap-1.5 rounded-2xl bg-white p-2.5 shadow-[0_14px_40px_rgba(0,13,54,0.2)] sm:gap-2 sm:p-3">
        {["#B718EC", "#5F3BC4", "#3ABD9E", "#C43B7D"].map((color) => (
          <span
            key={color}
            className="h-6 w-6 rounded-full sm:h-8 sm:w-8"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    </div>
    {/* Typography */}
    <div
      className={`absolute right-[3%] top-[8%] ${styles.float}`}
      style={depth(20)}
    >
      <span className="flex items-baseline gap-1 rounded-2xl bg-white px-4 py-2 font-bold text-[#000D36] shadow-[0_14px_40px_rgba(0,13,54,0.2)]">
        <span className="text-3xl sm:text-4xl">A</span>
        <span className="text-xl text-[#B718EC] sm:text-2xl">a</span>
      </span>
    </div>
    <Bubble
      d={12}
      icon={LuPenTool}
      background="linear-gradient(135deg,#3ABD9E,#2A8F78)"
      className="left-[6%] top-[12%]"
    />
    <div
      className={`absolute bottom-[22%] right-[10%] ${styles.float}`}
      style={depth(26)}
    >
      <LuMousePointer2 className="h-8 w-8 fill-[#000D36] text-white drop-shadow-lg sm:h-10 sm:w-10" />
    </div>
  </>
);

const CODE_LINES = [
  ["#C792EA:18", "#82AAFF:34"],
  ["#89DDFF:10", "#C3E88D:42", "#F78C6C:14"],
  ["#89DDFF:10", "#FFCB6B:26"],
  ["#89DDFF:10", "#82AAFF:30", "#C3E88D:20"],
  ["#C792EA:14"],
  ["#546E7A:48"],
  ["#C792EA:22", "#F78C6C:18"],
] as const;

const SoftwareVisual = () => (
  <>
    {/* Code editor */}
    <div
      className={`absolute left-[8%] top-[16%] w-[70%] -rotate-2 ${styles.float}`}
      style={depth(3)}
    >
      <div className="overflow-hidden rounded-2xl bg-[#0B1026] shadow-[0_30px_60px_rgba(0,13,54,0.45)]">
        <span className="flex gap-1.5 bg-[#151B3B] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#FF6B81]" />
          <span className="h-2 w-2 rounded-full bg-[#FDBA4D]" />
          <span className="h-2 w-2 rounded-full bg-[#3ABD9E]" />
        </span>
        <span className="flex flex-col gap-2.5 p-4">
          {CODE_LINES.map((line, row) => (
            <span key={row} className="flex gap-1.5">
              {line.map((token) => {
                const [color, width] = token.split(":");
                return (
                  <span
                    key={token}
                    className="h-1.5 rounded-full sm:h-2"
                    style={{ backgroundColor: color, width: `${width}%` }}
                  />
                );
              })}
            </span>
          ))}
        </span>
      </div>
    </div>
    {/* App on a phone */}
    <div
      className={`absolute bottom-[4%] right-[8%] h-[58%] w-[27%] rotate-6 ${styles.float}`}
      style={depth(12)}
    >
      <div className="h-full w-full rounded-[clamp(1rem,3vw,1.6rem)] bg-[#0B0B1A] p-[5%] shadow-[0_24px_50px_rgba(0,13,54,0.45)]">
        <span className="flex h-full w-full flex-col gap-[6%] overflow-hidden rounded-[clamp(0.8rem,2.5vw,1.3rem)] bg-white p-[9%]">
          <span className="h-[5%] w-1/2 rounded-full bg-[#000D36]" />
          <span className="h-[30%] rounded-lg bg-[linear-gradient(135deg,#E7A1FF,#B718EC)]" />
          <span className="h-[4%] rounded-full bg-[#F0E4F5]" />
          <span className="h-[4%] w-2/3 rounded-full bg-[#F0E4F5]" />
          <span className="mt-auto h-[11%] rounded-full bg-[#B718EC]" />
        </span>
      </div>
    </div>
    <Chip d={18} className="left-[1%] top-[8%]" color="#5F3BC4">
      Website
    </Chip>
    <Chip d={22} className="right-[2%] top-[14%]" color="#B718EC">
      Web-App
    </Chip>
    <Chip
      d={16}
      icon={LuShieldCheck}
      className="bottom-[12%] left-[4%]"
      color="#2A8F78"
    >
      Getestet
    </Chip>
  </>
);

const EventChips = () => (
  <>
    <Chip d={18} icon={LuRotate3D} className="left-[0%] top-[16%]" color="#5F3BC4">
      360°-Kamera
    </Chip>
    <Chip d={24} icon={LuCamera} className="right-[0%] top-[40%]" color="#C43B7D">
      Fotobox
    </Chip>
    <Chip d={14} icon={LuStore} className="bottom-[14%] left-[2%]" color="#2A8F78">
      Messestand
    </Chip>
    <Bubble
      d={28}
      icon={LuAperture}
      background="linear-gradient(135deg,#B718EC,#5F3BC4)"
      className="right-[10%] top-[6%]"
    />
  </>
);

const VISUALS: Record<Exclude<LandingVisualKey, "events" | "map">, () => ReactNode> = {
  social: SocialVisual,
  design: DesignVisual,
  software: SoftwareVisual,
};

interface Props {
  visual: LandingVisualKey;
  alt: string;
}

// Illustrated hero graphic: the brand shapes and gradient card of the home page hero,
// with a page-specific centrepiece. Pure CSS/SVG, so it stays crisp and needs no request.
const LandingVisual = ({ visual, alt }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref);

  if (visual === "map") {
    return (
      <div className="relative w-full max-w-[46rem]">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 h-[85%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white blur-2xl"
        />
        <Image
          src={GermanyMap}
          alt={alt}
          priority
          sizes="(max-width: 1024px) calc(100vw - 2rem), 48vw"
          className="h-auto w-full"
        />
      </div>
    );
  }

  if (visual === "events") {
    return (
      <div ref={ref} className={`relative w-full max-w-[34rem] ${styles.parallax}`}>
        <HeroVisual
          alt={alt}
          sizes="(max-width: 1024px) min(100vw - 2rem, 544px), min(42vw, 544px)"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <EventChips />
        </div>
      </div>
    );
  }

  const Centrepiece = VISUALS[visual];

  return (
    <div
      ref={ref}
      role="img"
      aria-label={alt}
      className={`relative aspect-square w-full max-w-[34rem] select-none ${styles.parallax}`}
    >
      <div aria-hidden className="absolute inset-0">
        <Shape name="green" d={-7} />
        <Shape name="blue" d={-5} />
        <div
          className={`absolute left-[13.5%] top-[12%] h-[73.6%] w-[74%] overflow-hidden rounded-3xl bg-[linear-gradient(140deg,#D48BFF_0%,#9B4DEB_45%,#5F3BC4_100%)] shadow-[0_10px_20px_rgba(0,0,0,0.2)] ${styles.float}`}
          style={depth(2)}
        >
          <span className="absolute -right-[20%] -top-[20%] h-[70%] w-[70%] rounded-full bg-[#FF8AD8]/50 blur-3xl" />
          <span className="absolute -bottom-[25%] -left-[15%] h-[65%] w-[65%] rounded-full bg-[#3BC4A3]/35 blur-3xl" />
        </div>
        <Shape name="purple" d={8} />
        <Shape name="pink" d={10} />
        <Centrepiece />
      </div>
    </div>
  );
};

export default LandingVisual;
