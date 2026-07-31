/**
 * Ratio (0–1, can exceed 1 when over target) -> a Tailwind text/background
 * class, the same "state to tint" mapping workouts/lib/tone.ts makes for
 * adherence. Kept local rather than shared: the bands mean something different
 * here — over 100% is a distinct, callout-worthy state for calories in a way it
 * never is for a habit or a workout.
 */
export function progressToneClass(ratio: number): string {
  if (ratio > 1.05) return "text-warning";
  if (ratio >= 0.9) return "text-positive";
  if (ratio >= 0.5) return "text-foreground";
  return "text-muted-foreground";
}

export function progressBarClass(ratio: number): string {
  if (ratio > 1.05) return "bg-warning";
  if (ratio >= 0.9) return "bg-positive";
  return "bg-accent";
}
