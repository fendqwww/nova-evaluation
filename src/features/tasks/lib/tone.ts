import type { TaskHorizon } from "@/features/tasks/lib/format";
import type { TaskPriority } from "@/features/tasks/types";

/**
 * The one place a task's urgency and importance become colour, mirroring
 * goals/lib/tone.ts — kept out of the components so the group header, the due
 * line and the priority chip can never disagree about how bad things are.
 *
 * Urgency uses the semantic palette (destructive / warning), importance uses a
 * separate quiet treatment. They are different axes, and painting both red
 * would leave a card with two competing alarms and no hierarchy.
 */

export function dueTextClass(horizon: TaskHorizon): string {
  switch (horizon) {
    case "overdue":
      return "text-destructive";
    case "today":
      return "text-warning";
    case "someday":
    case "done":
      return "text-subtle-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function groupHeaderClass(horizon: TaskHorizon): string {
  switch (horizon) {
    case "overdue":
      return "text-destructive";
    case "today":
      return "text-foreground";
    default:
      return "text-subtle-foreground";
  }
}

export function groupCountClass(horizon: TaskHorizon): string {
  switch (horizon) {
    case "overdue":
      return "bg-destructive-muted text-destructive";
    case "today":
      return "bg-accent-muted text-accent";
    default:
      return "bg-white/6 text-muted-foreground";
  }
}

/**
 * Importance as a left edge on the card rather than a badge.
 *
 * A high-priority task needs to be findable while scanning, and a coloured rail
 * does that without spending the horizontal space a chip costs — which on a
 * 390px screen is space the title needs. Normal priority gets no rail at all:
 * if the default were marked, every card would be marked and the signal would
 * be worth nothing.
 */
export function priorityRailClass(priority: TaskPriority, isCompleted: boolean): string {
  if (isCompleted || priority === "normal") return "bg-transparent";
  return priority === "high" ? "bg-destructive" : "bg-border-strong";
}

export function priorityChipClass(priority: TaskPriority): string {
  switch (priority) {
    case "high":
      return "bg-destructive-muted text-destructive";
    case "low":
      return "bg-white/6 text-subtle-foreground";
    default:
      return "bg-white/6 text-muted-foreground";
  }
}
