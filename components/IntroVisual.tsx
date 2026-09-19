import { useRef } from "react";
import Image from "next/image";
import Logo from "@/public/intro/logo.svg";
import Tablet from "@/public/intro/tablet.webp";
import Phone from "@/public/intro/phone.webp";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import styles from "@/styles/introVisual.module.scss";

type IntroVisualProps = {
  alt: string;
  sizes: string;
  className?: string;
};

// Three congruent layers (same 823 × 669 canvas as the Figma export): the logo
// shape drifts away from the pointer, tablet and phone towards it.
const IntroVisual = ({ alt, sizes, className }: IntroVisualProps) => {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={alt}
      className={`${styles.visual} ${className ?? ""}`}
    >
      <div className={styles.stage}>
        <Image
          src={Logo}
          alt=""
          unoptimized
          loading="lazy"
          draggable={false}
          className={`${styles.layer} ${styles.logo}`}
        />
        <Image
          src={Tablet}
          alt=""
          loading="lazy"
          sizes={sizes}
          draggable={false}
          className={`${styles.layer} ${styles.tablet}`}
        />
        <Image
          src={Phone}
          alt=""
          loading="lazy"
          sizes={sizes}
          draggable={false}
          className={`${styles.layer} ${styles.phone}`}
        />
      </div>
    </div>
  );
};

export default IntroVisual;
