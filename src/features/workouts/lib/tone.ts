import type { WorkoutDayState, WorkoutStats } from "@/features/workouts/lib/stats";

/**
 * The one place a workout's state becomes colour, mirroring habits/lib/tone.ts
 * and goals/lib/tone.ts — kept out of the components so the ring, the badge and
 * the calendar can never disagree about how training is going.
 *
 * The section's category chip stays health-green where globals.css puts it,
 * inside icon chips only. State uses the semantic palette, so "выполнено" is
 * the same green here as everywhere else in the app rather than a second
 * success colour.
 */
export type WorkoutTone = "done" | "open" | "planned" | "resting" | "archived";

export function workoutTone(stats: WorkoutStats, isArchived: boolean): WorkoutTone {
  if (isArchived) return "archived";
  if (stats.isDoneToday) return "done";
  if (stats.isOpenToday) return "open";
  return stats.isPlannedToday ? "planned" : "resting";
}

/** The today control: filled once finished, ringed while a session is open. */
export function startButtonClass(tone: WorkoutTone): string {
  switch (tone) {
    case "done":
      return "border-positive bg-positive text-background";
    case "open":
      return "border-accent bg-accent-muted text-accent";
    case "planned":
      return "border-border-strong text-muted-foreground active:border-accent";
    default:
      return "border-white/8 text-subtle-foreground";
  }
}

export function streakBadgeClass(streak: number): string {
  if (streak === 0) return "bg-white/6 text-subtle-foreground";
  // A streak is warmth, not urgency — the same small orange chip habits use.
  return "bg-tint-orange-muted text-tint-orange";
}

/** Ring / bar fill for the week's progress. */
export function progressFillClass(ratio: number, isArchived: boolean): string {
  if (isArchived) return "bg-white/15";
  return ratio >= 1 ? "bg-positive" : "bg-accent";
}

/**
 * A calendar cell. States come from dayState() in lib/stats.ts; this only
 * decides what each one looks like — "не по плану" reads distinct from
 * "пропущено" because a Mon/Thu programme is grey on Sunday by design, not out
 * of failure.
 */
export function dayCellClass(state: WorkoutDayState): string {
  switch (state) {
    case "done":
      return "bg-positive text-background font-semibold";
    case "open":
      return "border border-accent-border bg-accent-muted text-accent font-semibold";
    case "missed":
      return "border border-destructive/35 bg-destructive-muted text-destructive";
    case "planned":
      return "border border-accent-border text-foreground";
    case "unplanned":
      return "border border-white/6 text-subtle-foreground";
    case "future":
      return "border border-white/6 text-subtle-foreground/50";
    case "before":
      return "text-subtle-foreground/30";
  }
}

export function adherenceTextClass(adherence: number | null): string {
  if (adherence === null) return "text-muted-foreground";
  if (adherence >= 0.8) return "text-positive";
  if (adherence >= 0.5) return "text-warning";
  return "text-destructive";
}
