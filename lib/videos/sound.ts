/**
 * At most one carousel video may have sound: toggling a video either silences
 * it (if it was the audible one) or makes it the only audible one.
 */
export function toggleUnmuted(
  current: string | null,
  toggledId: string,
): string | null {
  return current === toggledId ? null : toggledId;
}

/** A video leaving the viewport must not keep playing sound off-screen. */
export function silenceIfHidden(
  current: string | null,
  hiddenId: string,
): string | null {
  return current === hiddenId ? null : current;
}
