import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { diffDays, formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import type { TaskItem, TaskPriority } from "@/features/tasks/types";

/**
 * Where a task sits relative to today.
 *
 * This drives grouping, colour and copy from one derivation, so the section
 * header, the badge on the card and the countdown line can never disagree about
 * whether something is late.
 *
 * A completed task is deliberately calm whatever its date says: once it is done
 * there is no time pressure left, and colouring a finished task red for a
 * deadline it already beat would be actively misleading — the same rule Goals
 * applies in deadlineInfo().
 */
export type TaskHorizon =
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "later"
  | "someday"
  | "done";

export interface TaskDueInfo {
  horizon: TaskHorizon;
  /** The phrase the card shows — "Просрочено на 2 дня", "Сегодня", "12 августа". */
  label: string;
  /** Absolute date, or null when the task has no due date. */
  date: string | null;
  /** Whole days until due; negative once passed, null when undated. */
  days: number | null;
}

export function taskDueInfo(task: TaskItem, today: CalendarDay): TaskDueInfo {
  if (task.isCompleted) {
    return {
      horizon: "done",
      label: task.dueDate ? formatDay(task.dueDate, today) : "Выполнено",
      date: task.dueDate ? formatDay(task.dueDate, today) : null,
      days: task.dueDate ? diffDays(today, task.dueDate) : null,
    };
  }

  if (!task.dueDate) {
    return { horizon: "someday", label: "Без срока", date: null, days: null };
  }

  const date = formatDay(task.dueDate, today);
  const days = diffDays(today, task.dueDate);

  if (days < 0) {
    const by = Math.abs(days);
    return {
      horizon: "overdue",
      label: `Просрочено на ${by} ${pluralizeRu(by, ["день", "дня", "дней"])}`,
      date,
      days,
    };
  }

  if (days === 0) return { horizon: "today", label: "Сегодня", date, days };
  if (days === 1) return { horizon: "tomorrow", label: "Завтра", date, days };
  if (days <= 7) {
    return {
      horizon: "week",
      label: `Через ${days} ${pluralizeRu(days, ["день", "дня", "дней"])}`,
      date,
      days,
    };
  }

  return { horizon: "later", label: date, date, days };
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface TaskGroup {
  horizon: TaskHorizon;
  title: string;
  tasks: TaskItem[];
}

const GROUP_TITLES: Record<TaskHorizon, string> = {
  overdue: "Просрочено",
  today: "Сегодня",
  tomorrow: "Завтра",
  week: "На этой неделе",
  later: "Позже",
  someday: "Без срока",
  done: "Выполнено",
};

/**
 * The order the day actually happens in.
 *
 * Overdue first because it is the only group that is already costing something;
 * undated tasks sink below every dated one because they make no claim on any
 * particular day; done sits at the bottom as a record rather than a queue.
 */
const GROUP_ORDER: TaskHorizon[] = [
  "overdue",
  "today",
  "tomorrow",
  "week",
  "later",
  "someday",
  "done",
];

/**
 * Tasks bucketed by due horizon, empty groups dropped.
 *
 * Grouping is the whole reason this section is not just a flat checklist: a
 * list of thirty tasks sorted by date reads as a wall, while the same thirty
 * under "Просрочено / Сегодня / Завтра" reads as a plan.
 */
export function groupTasks(
  tasks: TaskItem[],
  today: CalendarDay,
  sort: TaskSortId,
): TaskGroup[] {
  const buckets = new Map<TaskHorizon, TaskItem[]>();

  for (const task of tasks) {
    const { horizon } = taskDueInfo(task, today);
    const bucket = buckets.get(horizon);
    if (bucket) bucket.push(task);
    else buckets.set(horizon, [task]);
  }

  return GROUP_ORDER.flatMap((horizon) => {
    const bucket = buckets.get(horizon);
    if (!bucket || bucket.length === 0) return [];
    return [{ horizon, title: GROUP_TITLES[horizon], tasks: sortTasks(bucket, today, sort) }];
  });
}

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

/** High sorts above normal above low. */
const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };

// ---------------------------------------------------------------------------
// Filtering and sorting
// ---------------------------------------------------------------------------

export type TaskFilterId = "open" | "today" | "overdue" | "high" | "completed" | "all";

export const TASK_FILTERS: { id: TaskFilterId; label: string }[] = [
  { id: "open", label: "Активные" },
  { id: "today", label: "Сегодня" },
  { id: "overdue", label: "Просроченные" },
  { id: "high", label: "Важные" },
  { id: "completed", label: "Выполненные" },
  { id: "all", label: "Все" },
];

export function matchesFilter(
  task: TaskItem,
  filter: TaskFilterId,
  today: CalendarDay,
): boolean {
  const { horizon } = taskDueInfo(task, today);

  switch (filter) {
    case "all":
      return true;
    case "open":
      return !task.isCompleted;
    case "today":
      // Overdue work is still work that has to happen today, so it belongs in
      // the "Сегодня" filter — a user clearing today's list should not have to
      // check a second chip to find what is already late.
      return horizon === "today" || horizon === "overdue";
    case "overdue":
      return horizon === "overdue";
    case "high":
      return !task.isCompleted && task.priority === "high";
    case "completed":
      return task.isCompleted;
  }
}

export function countByFilter(
  tasks: TaskItem[],
  filter: TaskFilterId,
  today: CalendarDay,
): number {
  return tasks.filter((task) => matchesFilter(task, filter, today)).length;
}

export type TaskSortId = "due" | "priority" | "created" | "title";

// One word each, because the control sits beside the search field on a 390px
// screen — the same constraint that shortened the Goals sort labels.
export const TASK_SORTS: { id: TaskSortId; label: string }[] = [
  { id: "due", label: "Срок" },
  { id: "priority", label: "Важность" },
  { id: "created", label: "Создано" },
  { id: "title", label: "Название" },
];

/**
 * Sorting inside a group.
 *
 * Completion is not a tiebreaker here the way it is in sortGoals: grouping
 * already puts every finished task in its own section at the bottom, so a
 * second completion rule would be dead code pretending to be a safeguard.
 *
 * Every comparison falls back to creation order so the list cannot reshuffle
 * between renders for no visible reason.
 */
export function sortTasks(
  tasks: TaskItem[],
  today: CalendarDay,
  sort: TaskSortId,
): TaskItem[] {
  const byCreated = (a: TaskItem, b: TaskItem) => a.createdAt.localeCompare(b.createdAt);

  return [...tasks].sort((a, b) => {
    switch (sort) {
      case "due": {
        // An undated task has no claim on "sooner", so it sorts last. Within a
        // date, importance decides — that is the pair of keys people actually
        // triage by.
        if (a.dueDate && b.dueDate) {
          const diff = a.dueDate.localeCompare(b.dueDate);
          if (diff !== 0) return diff;
        } else if (a.dueDate) return -1;
        else if (b.dueDate) return 1;

        const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        return byPriority !== 0 ? byPriority : byCreated(a, b);
      }
      case "priority": {
        const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (diff !== 0) return diff;
        const aDays = taskDueInfo(a, today).days;
        const bDays = taskDueInfo(b, today).days;
        if (aDays !== null && bDays !== null && aDays !== bDays) return aDays - bDays;
        if (aDays !== null && bDays === null) return -1;
        if (aDays === null && bDays !== null) return 1;
        return byCreated(a, b);
      }
      case "created":
        return byCreated(b, a);
      case "title": {
        const diff = a.title.localeCompare(b.title, "ru");
        return diff !== 0 ? diff : byCreated(a, b);
      }
    }
  });
}

export function matchesSearch(task: TaskItem, query: string): boolean {
  const trimmed = query.trim().toLocaleLowerCase("ru");
  if (!trimmed) return true;
  return task.title.toLocaleLowerCase("ru").includes(trimmed);
}
