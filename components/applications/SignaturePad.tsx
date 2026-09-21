import { useRef, useState, type PointerEvent } from "react";

interface Props {
  id: string;
  /** PNG data URL of the signature, or null when empty / cleared */
  onChange: (dataUrl: string | null) => void;
  invalid?: boolean;
  describedBy?: string;
}

// Internal resolution; the canvas is scaled to the available width via CSS.
const WIDTH = 900;
const HEIGHT = 300;
// A tap or a dot is not a signature.
const MIN_STROKE_LENGTH = 180;

/** Signature field for finger, pen or mouse (Pointer Events). */
const SignaturePad = ({ id, onChange, invalid, describedBy }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const strokeLength = useRef(0);
  const [hasInk, setHasInk] = useState(false);

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const next = point(e);
    ctx.strokeStyle = "#000D36";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();

    strokeLength.current += Math.hypot(
      next.x - last.current.x,
      next.y - last.current.y,
    );
    last.current = next;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;

    const signed = strokeLength.current >= MIN_STROKE_LENGTH;
    setHasInk(strokeLength.current > 0);
    onChange(signed ? canvasRef.current!.toDataURL("image/png") : null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, WIDTH, HEIGHT);
    strokeLength.current = 0;
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div className="relative select-none">
        <canvas
          id={id}
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          role="img"
          aria-label="Unterschriftenfeld – mit Finger, Stift oder Maus unterschreiben"
          aria-describedby={describedBy}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className={`block aspect-[3/1] w-full cursor-crosshair touch-none rounded-xl border bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] ${
            invalid ? "border-red-500" : "border-[#E4D3EC]"
          }`}
        />
        {!hasInk && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-[#a99fb0]"
            aria-hidden
          >
            ✍️ Hier unterschreiben
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        disabled={!hasInk}
        className="mt-1.5 rounded-lg py-1 text-sm font-medium text-[#B718EC] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] disabled:text-[#a99fb0] disabled:no-underline"
      >
        Unterschrift löschen
      </button>
    </div>
  );
};

export default SignaturePad;
