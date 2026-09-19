import { useEffect, type RefObject } from "react";

// Pointer distance (in element sizes) at which the effect is ~saturated.
const REACH = 1;
// Lower = lazier, softer follow.
const EASE = 0.07;

/**
 * Writes the eased pointer offset relative to the element's centre into the CSS
 * custom properties `--px` / `--py` (-1 … 1). The pointer is tracked on the whole
 * window, so passing by or circling around the element already moves it. The loop
 * eases towards the target and sleeps once it has settled. Inactive on touch
 * devices, with reduced motion and while the element is off screen.
 */
export function usePointerParallax(ref: RefObject<HTMLElement | null>) {
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
      // Soft saturation: responsive near the element, levels off far away.
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
  }, [ref]);
}
