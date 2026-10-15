import { useRouter } from "next/router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { stepProgress } from "@/lib/applications/steps";

/**
 * Step state of a multi-step application form. Every "Weiter" adds a browser
 * history entry (same URL), so the back button / back swipe on a phone goes
 * one step back instead of leaving the page and losing the input.
 */
export function useStepFlow<T extends string>(
  steps: readonly T[],
  historyKey: string,
) {
  const router = useRouter();
  const [current, setCurrent] = useState<T>(steps[0]);
  // Latest values for the history handlers, updated right after each render.
  const stepsRef = useRef(steps);
  const currentRef = useRef(current);
  useLayoutEffect(() => {
    stepsRef.current = steps;
    currentRef.current = current;
  });

  // After a successful submit, history moves are no longer step changes.
  const finishedRef = useRef(false);
  // Element to focus after the next step change (null = the step heading).
  const focusTargetRef = useRef<string | null>(null);
  const changedRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ownEntry = useCallback(
    (state: unknown): { step: string } | null => {
      const entry = (state as Record<string, unknown> | null)?.[historyKey];
      return entry && typeof (entry as { step?: unknown }).step === "string"
        ? (entry as { step: string })
        : null;
    },
    [historyKey],
  );

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (finishedRef.current) return;
      const step = ownEntry(event.state)?.step;
      const known = stepsRef.current.find((s) => s === step);
      changedRef.current = true;
      // The page's own entry (no step) is the first step.
      setCurrent(known ?? stepsRef.current[0]);
    };
    window.addEventListener("popstate", onPopState);

    // Going back to this page's own entry is a step change for us; Next.js
    // must not treat it as a navigation. Entries of other pages are left to it.
    const asPath = router.asPath;
    router.beforePopState(({ as }) => as !== asPath);

    return () => {
      window.removeEventListener("popstate", onPopState);
      router.beforePopState(() => true);
    };
  }, [router, ownEntry]);

  // After a step change: scroll the card into view, focus heading or field.
  useEffect(() => {
    if (!changedRef.current) return;
    changedRef.current = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    const field = focusTargetRef.current
      ? document.getElementById(focusTargetRef.current)
      : null;
    focusTargetRef.current = null;

    if (field) {
      field.scrollIntoView({ behavior, block: "center" });
      field.focus({ preventScroll: true });
      return;
    }
    const card = containerRef.current;
    if (card && card.getBoundingClientRect().top < 0) {
      card.scrollIntoView({ behavior, block: "start" });
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [current]);

  /** Shows `target`; optionally focuses the element with `focusId` there. */
  const goTo = useCallback(
    (target: T, focusId?: string) => {
      const list = stepsRef.current;
      const from = list.indexOf(currentRef.current);
      const to = list.indexOf(target);
      if (to < 0) return;
      focusTargetRef.current = focusId ?? null;
      changedRef.current = true;

      if (to === from) {
        // Same step: just move the focus (e.g. to a field with an error).
        focusTargetRef.current = null;
        changedRef.current = false;
        const field = focusId ? document.getElementById(focusId) : null;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        field?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        field?.focus({ preventScroll: true });
        return;
      }

      if (to === from + 1) {
        window.history.pushState({ [historyKey]: { step: target } }, "");
        setCurrent(target);
        return;
      }

      // Earlier steps sit behind this entry in the history (one per step):
      // walk back there, the popstate handler then shows the step.
      const entry = ownEntry(window.history.state);
      if (to < from && entry?.step === currentRef.current) {
        window.history.go(to - from);
        return;
      }
      setCurrent(target);
    },
    [historyKey, ownEntry],
  );

  const index = Math.max(0, steps.indexOf(current));

  /**
   * Leaves the step history after a successful submit, so "back" then goes to
   * the previous page. Resolves once the browser is back on the page's own
   * entry — show the confirmation only then, while this form (and its
   * popstate handling) is still mounted.
   */
  const finish = useCallback(
    () =>
      new Promise<void>((resolve) => {
        finishedRef.current = true;
        const from = stepsRef.current.indexOf(currentRef.current);
        if (from <= 0 || ownEntry(window.history.state)?.step !== currentRef.current) {
          resolve();
          return;
        }
        const done = () => {
          window.removeEventListener("popstate", done);
          resolve();
        };
        window.addEventListener("popstate", done);
        // Safety net in case a browser doesn't report the traversal.
        window.setTimeout(done, 1500);
        window.history.go(-from);
      }),
    [ownEntry],
  );

  return {
    current,
    index,
    isFirst: index === 0,
    isLast: index === steps.length - 1,
    goTo,
    next: () => {
      const target = steps[index + 1];
      if (target) goTo(target);
    },
    back: () => {
      const target = steps[index - 1];
      if (target) goTo(target);
    },
    finish,
    headingRef,
    containerRef,
  };
}

const primaryButtonClass =
  "min-h-12 rounded-2xl bg-[#B718EC] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-200 motion-safe:transition motion-safe:duration-200 motion-safe:active:scale-[0.98] hover:bg-[#a514d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] disabled:cursor-not-allowed disabled:opacity-50";

interface StepCardProps {
  stepKey: string;
  index: number;
  total: number;
  title: string;
  hint?: ReactNode;
  headingRef: RefObject<HTMLHeadingElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  /** Message for the whole step / form (shown above the buttons) */
  error?: string;
  onBack?: () => void;
  /**
   * The primary button submits the surrounding form on every step, so the
   * Enter / "Go" key moves on as well; the form decides between next step
   * and sending.
   */
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Below the buttons, e.g. "* Pflichtfeld" */
  footer?: ReactNode;
}

/** One step of an application form: progress, heading, fields, navigation. */
export function StepCard({
  stepKey,
  index,
  total,
  title,
  hint,
  headingRef,
  containerRef,
  children,
  error,
  onBack,
  nextLabel = "Weiter",
  nextDisabled,
  footer,
}: StepCardProps) {
  const { position, percent } = stepProgress(index, total);

  return (
    <div
      ref={containerRef}
      className="scroll-mt-4 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm sm:p-7"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[#556987]">
          Schritt {position} von {total}
        </p>
        <div
          role="progressbar"
          aria-label="Fortschritt der Bewerbung"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`Schritt ${position} von ${total}: ${title}`}
          className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3E8F9]"
        >
          <div
            className="h-full rounded-full bg-[#B718EC] transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* key: restarts the enter animation on every step change */}
      <div key={stepKey} className="mt-5 flex flex-col gap-5 motion-safe:animate-step-in">
        <div>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-balance text-xl font-bold text-[#000D36] focus:outline-none sm:text-2xl"
          >
            {title}
          </h2>
          {hint && <div className="mt-1.5 text-sm text-[#556987]">{hint}</div>}
        </div>

        <div className="flex flex-col gap-4">{children}</div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        )}

        <div className={`grid gap-3 ${onBack ? "grid-cols-[auto_1fr]" : "grid-cols-1"}`}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="min-h-12 rounded-2xl border border-[#E4D3EC] bg-white px-4 text-sm font-medium text-[#556987] hover:border-[#B718EC] hover:text-[#B718EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
            >
              ← Zurück
            </button>
          )}
          <button type="submit" disabled={nextDisabled} className={primaryButtonClass}>
            {nextLabel}
          </button>
        </div>

        {footer}
      </div>
    </div>
  );
}
