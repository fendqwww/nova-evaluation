import type { CalendarDay } from "@/shared/lib/calendar-day";

/**
 * A user-set importance, unlike GoalStatus which is derived. Goals deliberately
 * has no priority column (see the note in goals-view.tsx) because a goal's
 * urgency follows from its deadline; a task list is the opposite case — two
 * tasks due the same day are routinely not equally important, and only the user
 * knows which.
 */
export type TaskPriority = "low" | "normal" | "high";

/**
 * A task as the client sees it.
 *
 * `dueDate` is a CalendarDay rather than a full ISO instant: a task is due on a
 * day, not at a moment, and carrying a timestamp would invite the same
 * off-by-one that formatting a deadline in the local zone causes.
 *
 * There is no `steps` array. A checklist under a title is exactly what GoalStep
 * already models, and in this product a task that needs sub-items is a goal —
 * see the note on the Task model in schema.prisma.
 */
export interface TaskItem {
  id: string;
  title: string;
  note: string | null;
  isCompleted: boolean;
  /** ISO instant of completion, or null while open. */
  completedAt: string | null;
  /** The day it is due, or null when it is just "someday". */
  dueDate: CalendarDay | null;
  priority: TaskPriority;
  createdAt: string;
}

/**
 * One fetch of the Tasks screen.
 *
 * `today` is resolved from the profile timezone server-side, for the same
 * reason HabitsSnapshot carries it: "просрочено" is a claim about which day it
 * is, and the client's clock is not the authority on that.
 */
export interface TasksSnapshot {
  today: CalendarDay;
  tasks: TaskItem[];
}
