import Image from "next/image";

// Mobile ~1.3 slides · sm 2 · md 3 · lg 4 (see the slide widths in VideoCarousel).
const SLIDE_SIZES =
  "(max-width: 640px) 72vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";

/**
 * Cover behind a video slide. Lazy and resized through next/image, so the
 * carousel far below the hero no longer downloads every full-size cover
 * while the page is still loading.
 */
const VideoCover = ({ src }: { src: string }) =>
  src ? (
    <Image
      src={src}
      alt=""
      fill
      sizes={SLIDE_SIZES}
      className="object-cover"
    />
  ) : null;

export default VideoCover;
