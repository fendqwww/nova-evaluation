import type { CareDayState, CareRoutineStats } from "@/features/appearance/lib/stats";

/**
 * The one place a routine's state becomes colour, mirroring habits/lib/tone.ts
 * and workouts/lib/tone.ts — kept out of the components so the ring, the badge
 * and the calendar can never disagree about how care is going.
 *
 * State uses the semantic palette, so "выполнено" is the same green here as
 * everywhere else in the app rather than a second success colour.
 */
export type CareTone = "done" | "partial" | "due" | "resting" | "archived";

/**
 * `isDone`/`stepsDone` describe the day actually on screen, not necessarily
 * today — a routine card viewing yesterday must not borrow today's
 * completion state, or the fill colour and the checklist count it wraps can
 * end up describing two different days at once. `isDueToday` alone still
 * comes from the stats object: it only distinguishes "due" from "resting",
 * both of which render as the same empty ring either way.
 */
export function careTone(
  isDone: boolean,
  stepsDone: number,
  isDueToday: CareRoutineStats["isDueToday"],
  isArchived: boolean,
): CareTone {
  if (isArchived) return "archived";
  if (isDone) return "done";
  if (stepsDone > 0) return "partial";
  return isDueToday ? "due" : "resting";
}

/** The card's today control: filled once finished, ringed while in progress. */
export function toggleButtonClass(tone: CareTone): string {
  switch (tone) {
    case "done":
      return "border-positive bg-positive text-background";
    case "partial":
      return "border-accent bg-accent-muted text-accent";
    case "due":
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

export function progressFillClass(ratio: number, isArchived: boolean): string {
  if (isArchived) return "bg-white/15";
  return ratio >= 1 ? "bg-positive" : "bg-accent";
}

/**
 * A calendar cell. States come from dayState() in lib/stats.ts; this only
 * decides what each one looks like — "не по плану" reads distinct from
 * "пропущено" because a Mon/Thu routine is grey on Sunday by design, not out of
 * failure, and "частично" is its own shade because a half-done checklist is
 * genuinely neither.
 */
export function dayCellClass(state: CareDayState): string {
  switch (state) {
    case "done":
      return "bg-positive text-background font-semibold";
    case "partial":
      return "border border-accent-border bg-accent-muted text-accent font-semibold";
    case "missed":
      return "border border-destructive/35 bg-destructive-muted text-destructive";
    case "unscheduled":
      return "border border-white/6 text-subtle-foreground";
    case "future":
      return "border border-white/6 text-subtle-foreground/50";
    case "before":
      return "text-subtle-foreground/30";
  }
}

export function adherenceTextClass(adherence: number): string {
  if (adherence >= 0.8) return "text-positive";
  if (adherence >= 0.5) return "text-warning";
  return "text-destructive";
}
