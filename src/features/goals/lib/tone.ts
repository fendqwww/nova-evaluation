import type { DeadlineTone, GoalStatus } from "@/features/goals/lib/format";

/**
 * The one place a goal's urgency becomes colour. Kept out of the components so
 * the badge, the countdown line and the progress bar can never disagree about
 * what "срочно" looks like.
 */
export function statusBadgeClass(tone: GoalStatus["tone"]): string {
  switch (tone) {
    case "done":
      return "bg-positive-muted text-positive";
    case "overdue":
    case "critical":
      return "bg-destructive-muted text-destructive";
    case "soon":
      return "bg-warning-muted text-warning";
    case "active":
      return "bg-accent-muted text-accent";
    default:
      return "bg-fill-muted text-muted-foreground";
  }
}

export function countdownTextClass(tone: DeadlineTone): string {
  switch (tone) {
    case "overdue":
    case "critical":
      return "text-destructive";
    case "soon":
      return "text-warning";
    case "none":
      return "text-subtle-foreground";
    default:
      return "text-muted-foreground";
  }
}

/** Progress fill: brand accent while in flight, green once the goal is done. */
export function progressFillClass(isCompleted: boolean, tone: DeadlineTone): string {
  if (isCompleted) return "bg-positive";
  if (tone === "overdue") return "bg-destructive";
  return "bg-accent";
}
