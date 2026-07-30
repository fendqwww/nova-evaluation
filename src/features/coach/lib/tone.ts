import type { CoachActionTarget, CoachBulletTone } from "@/features/coach/types";

/**
 * Colour lives here, not in the components.
 *
 * Same split the Habits and Tasks sections use: every conditional class is one
 * lookup away from the markup, so a card is a layout and a tone map is a
 * palette. Nothing new is introduced — positive / warning / destructive are the
 * app's existing semantic tokens, and neutral is plain muted text.
 */

export function bulletDotClass(tone: CoachBulletTone): string {
  switch (tone) {
    case "positive":
      return "bg-positive";
    case "warning":
      return "bg-warning";
    case "critical":
      return "bg-destructive";
    case "neutral":
      return "bg-subtle-foreground";
  }
}

export function bulletTextClass(tone: CoachBulletTone): string {
  switch (tone) {
    case "positive":
      return "text-foreground";
    case "warning":
      return "text-foreground";
    case "critical":
      return "text-foreground";
    case "neutral":
      return "text-muted-foreground";
  }
}

/**
 * A delta's colour depends on which way the metric wants to move — one more
 * overdue task is red however you write the sign.
 */
export function deltaClass(delta: number, higherIsBetter: boolean): string {
  if (delta === 0) return "text-subtle-foreground";
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  return isGood ? "text-positive" : "text-destructive";
}

export function deltaBadgeClass(delta: number, higherIsBetter: boolean): string {
  if (delta === 0) return "bg-white/[0.06] text-subtle-foreground";
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  return isGood
    ? "bg-positive-muted text-positive"
    : "bg-destructive-muted text-destructive";
}

/** "+3" / "−2" / "0" — a real minus sign, and never a bare "-2". */
export function formatDelta(delta: number, suffix = ""): string {
  if (delta === 0) return `0${suffix}`;
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)}${suffix}`;
}

const TARGET_HREF: Record<CoachActionTarget, string> = {
  goals: "/goals",
  habits: "/habits",
  tasks: "/tasks",
};

export function actionHref(target: CoachActionTarget | null): string | null {
  return target ? TARGET_HREF[target] : null;
}
