import type { DayCellState, HabitStats } from "@/features/habits/lib/stats";

/**
 * The one place a habit's state becomes colour, mirroring goals/lib/tone.ts —
 * kept out of the components so the ring, the streak badge and the week strip
 * can never disagree about how a habit is doing.
 *
 * The Habit category tint (orange) stays where globals.css puts it: inside icon
 * chips. Progress and state use the semantic palette, so "done" is the same
 * green here as everywhere else in the app rather than a second success colour.
 */
export type HabitTone = "kept" | "due" | "resting" | "archived";

export function habitTone(stats: HabitStats, isArchived: boolean): HabitTone {
  if (isArchived) return "archived";
  if (stats.isDoneToday) return "kept";
  return stats.isDueToday ? "due" : "resting";
}

/** The today-tick control: filled once kept, outlined while owed. */
export function tickClass(tone: HabitTone): string {
  switch (tone) {
    case "kept":
      return "border-positive bg-positive text-background";
    case "due":
      return "border-border-strong text-transparent active:border-accent";
    default:
      return "border-border text-transparent";
  }
}

export function streakBadgeClass(streak: number): string {
  if (streak === 0) return "bg-fill-muted text-subtle-foreground";
  // A streak is warmth, not urgency — the orange here is the Habit tint doing
  // the one job the palette reserves for it, a small chip.
  return "bg-tint-orange-muted text-tint-orange";
}

/** Ring / bar fill for the week's progress. */
export function progressFillClass(stats: HabitStats, isArchived: boolean): string {
  if (isArchived) return "bg-fill-strong";
  return stats.week.ratio >= 1 ? "bg-positive" : "bg-accent";
}

/**
 * A calendar cell. The states are computed by dayState() in lib/stats.ts; this
 * only decides what each one looks like — "not scheduled" reads distinct from
 * "missed" because a weekday-only habit is grey on Sundays out of design, not
 * out of failure.
 */
export function dayCellClass(state: DayCellState): string {
  switch (state) {
    case "kept":
      return "bg-positive text-background font-semibold";
    case "missed":
      return "border border-destructive/35 bg-destructive-muted text-destructive";
    case "unscheduled":
      return "border border-border text-subtle-foreground";
    case "future":
      return "border border-border text-subtle-foreground/50";
    case "before":
      return "text-subtle-foreground/30";
  }
}

export function adherenceTextClass(adherence: number): string {
  if (adherence >= 0.8) return "text-positive";
  if (adherence >= 0.5) return "text-warning";
  return "text-destructive";
}
