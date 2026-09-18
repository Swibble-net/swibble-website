import { useEffect, useRef } from "react";
import Image from "next/image";
import CardBackground from "@/public/hero/card-bg.webp";
import Person from "@/public/hero/fynn-frings.webp";
import styles from "@/styles/heroVisual.module.scss";

// Pointer distance (in image sizes) at which the effect is ~saturated.
const REACH = 1;
// Lower = lazier, softer follow.
const EASE = 0.07;

const SHAPES = {
  green: {
    fill: "#3BC4A3",
    d: "M208.732 533.849C213.719 540.703 208.823 550.321 200.347 550.321H83.2678C74.6457 550.334 66.2182 547.756 59.0762 542.921C52.1195 538.221 46.6741 531.602 43.3997 523.866C41.145 518.533 39.9887 512.8 40.0001 507.009L40.0001 403.442C39.9863 394.812 42.5605 386.377 47.3896 379.228C52.0853 372.264 58.6979 366.813 66.4261 363.536C71.7541 361.279 77.4823 360.122 83.2678 360.133H92.3047C99.3021 360.133 105.791 363.79 109.414 369.776L208.732 533.849Z",
  },
  blue: {
    fill: "#5F3BC4",
    d: "M349.53 96.2814C342.661 92.9293 338.303 85.9542 338.303 78.3103C338.289 69.6801 340.863 61.2444 345.69 54.095C350.384 47.1316 356.995 41.6808 364.72 38.403C370.046 36.146 375.773 34.9886 381.557 35.0001L505.756 35.0001C514.374 34.9862 522.798 37.5628 529.938 42.3962C536.893 47.0965 542.337 53.7156 545.611 61.4515C547.865 66.785 549.021 72.519 549.009 78.3104L549.009 161.608C549.009 176.391 533.524 186.065 520.238 179.582L349.53 96.2814Z",
  },
  purple: {
    fill: "#963BC4",
    d: "M100.992 168.333C97.2461 173.658 91.1435 176.826 84.6335 176.826H72.9168C68.8545 176.829 64.8314 176.03 61.0776 174.473C57.3239 172.916 53.9132 170.633 51.0406 167.753C48.1681 164.873 45.8902 161.454 44.3371 157.691C42.7841 153.929 41.9864 149.896 41.9898 145.823V68.9364C41.9864 64.8641 42.7841 60.8311 44.3371 57.0682C45.8902 53.3052 48.1681 49.8862 51.0406 47.0066C53.9132 44.1271 57.3239 41.8436 61.0776 40.2867C64.8314 38.7299 68.8545 37.9303 72.9168 37.9336H154.198C170.4 37.9336 179.878 56.1892 170.556 69.4406L100.992 168.333Z",
  },
  pink: {
    fill: "#C43B7D",
    d: "M503.192 419.063C506.763 412.868 513.369 409.051 520.519 409.051L523.918 409.051C528.927 409.043 533.822 410.537 537.971 413.342C542.012 416.069 545.175 419.909 547.077 424.396C548.387 427.49 549.059 430.817 549.052 434.176L549.052 512.066C549.06 517.072 547.565 521.966 544.76 526.114C542.032 530.154 538.191 533.316 533.702 535.217C530.607 536.527 527.279 537.198 523.918 537.191L469.712 537.191C454.322 537.191 444.699 520.537 452.385 507.203L503.192 419.063Z",
  },
} as const;

const Shape = ({ name }: { name: keyof typeof SHAPES }) => (
  <div className={`${styles.layer} ${styles[name]}`}>
    <svg className={styles.shape} viewBox="0 0 590 596" aria-hidden>
      <path fill={SHAPES[name].fill} d={SHAPES[name].d} />
    </svg>
  </div>
);

type HeroVisualProps = {
  alt: string;
  sizes: string;
  className?: string;
};

// The pointer is tracked on the whole window, so passing by or circling around
// the image already moves it. The loop eases towards the target and sleeps
// once it has settled.
const HeroVisual = ({ alt, sizes, className }: HeroVisualProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cur = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let raf = 0;

    const tick = () => {
      cur.x += (target.x - cur.x) * EASE;
      cur.y += (target.y - cur.y) * EASE;
      const settled =
        Math.abs(target.x - cur.x) < 0.001 &&
        Math.abs(target.y - cur.y) < 0.001;
      if (settled) {
        cur.x = target.x;
        cur.y = target.y;
      }
      el.style.setProperty("--px", cur.x.toFixed(4));
      el.style.setProperty("--py", cur.y.toFixed(4));
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width * REACH);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height * REACH);
      // Soft saturation: responsive near the image, levels off far away.
      const len = Math.hypot(dx, dy);
      const k = len > 0 ? Math.tanh(len) / len : 0;
      target.x = dx * k;
      target.y = dy * k;
      wake();
    };

    const reset = () => {
      target.x = 0;
      target.y = 0;
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={alt}
      className={`${styles.visual} ${className ?? ""}`}
    >
      <div className={styles.stage}>
        <Shape name="green" />
        <Shape name="blue" />
        <div className={`${styles.layer} ${styles.cardLayer}`}>
          <div className={styles.card}>
            <Image
              src={CardBackground}
              alt=""
              priority
              sizes={sizes}
              className={styles.cardBackground}
            />
            <Image
              src={Person}
              alt=""
              priority
              sizes={sizes}
              draggable={false}
              className={styles.person}
            />
          </div>
        </div>
        <Shape name="purple" />
        <Shape name="pink" />
      </div>
    </div>
  );
};

export default HeroVisual;
