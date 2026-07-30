import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { GoalItem } from "@/features/goals/types";

/**
 * A deadline is a calendar day, not an instant.
 *
 * Every function here pins itself to UTC, and the column is written at UTC
 * midnight, so the day the user picked is the day they are shown. Formatting in
 * the local zone instead would render "15 августа" as the 14th for anyone west
 * of Greenwich — the classic off-by-one that makes a date field feel broken.
 */
export function parseTargetDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** ISO -> "YYYY-MM-DD" for the value of <input type="date">. */
export function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

const dayMonth = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const dayMonthYear = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Today at UTC midnight, so it compares cleanly against a stored deadline. */
function utcToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function formatTargetDate(iso: string): string {
  const date = new Date(iso);
  // The year only earns its space when it isn't the current one.
  const formatter =
    date.getUTCFullYear() === utcToday().getUTCFullYear() ? dayMonth : dayMonthYear;
  return formatter.format(date);
}

/** Whole days from today to the deadline: negative once it has passed. */
export function daysUntil(iso: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((new Date(iso).getTime() - utcToday().getTime()) / MS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface GoalProgress {
  done: number;
  total: number;
  remaining: number;
  /** 0–1. A goal with no steps reads straight off its completion flag. */
  ratio: number;
  percent: number;
  hasSteps: boolean;
}

export function goalProgress(goal: GoalItem): GoalProgress {
  const total = goal.steps.length;
  const done = goal.steps.filter((step) => step.isDone).length;
  const ratio = total === 0 ? (goal.isCompleted ? 1 : 0) : done / total;

  return {
    done,
    total,
    remaining: total - done,
    ratio,
    percent: Math.round(ratio * 100),
    hasSteps: total > 0,
  };
}

export function formatStepCount(done: number, total: number): string {
  return `${done} из ${total} ${pluralizeRu(total, ["шага", "шагов", "шагов"])}`;
}

export function formatRemainingSteps(remaining: number): string {
  return `осталось ${remaining} ${pluralizeRu(remaining, ["шаг", "шага", "шагов"])}`;
}

// ---------------------------------------------------------------------------
// Deadline
// ---------------------------------------------------------------------------

/** Drives both the countdown's colour and the status badge's colour. */
export type DeadlineTone = "overdue" | "critical" | "soon" | "calm" | "none";

export interface DeadlineInfo {
  /** The live countdown — the thing the user actually reads. */
  countdown: string;
  /** Absolute date, or null when the goal has no deadline. */
  date: string | null;
  tone: DeadlineTone;
  /** Whole days remaining; null when there is no deadline. */
  days: number | null;
}

/**
 * The deadline as a phrase that counts, not a date that sits there.
 *
 * A completed goal is deliberately calm whatever its date says: once it is done
 * there is no time pressure left, and colouring a finished goal red for a date
 * it already beat would be actively misleading.
 */
export function deadlineInfo(goal: GoalItem): DeadlineInfo {
  if (!goal.targetDate) {
    return { countdown: "Без срока", date: null, tone: "none", days: null };
  }

  const date = formatTargetDate(goal.targetDate);
  const days = daysUntil(goal.targetDate);

  if (goal.isCompleted) {
    return { countdown: date, date, tone: "calm", days };
  }

  if (days < 0) {
    const by = Math.abs(days);
    return {
      countdown: `Просрочено на ${by} ${pluralizeRu(by, ["день", "дня", "дней"])}`,
      date,
      tone: "overdue",
      days,
    };
  }

  if (days === 0) {
    return { countdown: "Сегодня последний день", date, tone: "critical", days };
  }

  // "soon", not "critical": tomorrow is urgent but it is not the last day, and
  // goalStatus badges it "СРОЧНО" (amber). Red here would leave the badge and
  // the countdown on the same card disagreeing about how bad things are.
  if (days === 1) {
    return { countdown: "Остался 1 день", date, tone: "soon", days };
  }

  return {
    countdown: `Осталось ${days} ${pluralizeRu(days, ["день", "дня", "дней"])}`,
    date,
    tone: days <= 3 ? "soon" : "calm",
    days,
  };
}

/** The compact form for tight spots: "12 дней", "Завтра", "Просрочено на 2 дня". */
export function shortCountdown(goal: GoalItem): string {
  const { days } = deadlineInfo(goal);
  if (days === null) return "Без срока";
  if (days < 0) {
    const by = Math.abs(days);
    return `Просрочено на ${by} ${pluralizeRu(by, ["день", "дня", "дней"])}`;
  }
  if (days === 0) return "Сегодня";
  if (days === 1) return "Завтра";
  return `${days} ${pluralizeRu(days, ["день", "дня", "дней"])}`;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type GoalStatusId =
  | "done"
  | "overdue"
  | "today"
  | "urgent"
  | "in_progress"
  | "not_started"
  | "no_deadline";

export interface GoalStatus {
  id: GoalStatusId;
  label: string;
  tone: DeadlineTone | "done" | "active" | "idle";
}

/**
 * A single badge summarising where the goal stands, derived entirely from the
 * data that already exists — deadline distance first, because that is what
 * actually forces action, then how far along it is.
 *
 * This is a *state*, not a user-set priority. A real "высокий / средний /
 * низкий" priority needs a Goal.priority column and a write path in the create
 * and update actions; see the note in goals-view.tsx.
 */
export function goalStatus(goal: GoalItem): GoalStatus {
  if (goal.isCompleted) return { id: "done", label: "Выполнено", tone: "done" };

  const { days } = deadlineInfo(goal);

  if (days !== null) {
    if (days < 0) return { id: "overdue", label: "Просрочено", tone: "overdue" };
    if (days === 0) return { id: "today", label: "Последний день", tone: "critical" };
    if (days <= 3) return { id: "urgent", label: "Срочно", tone: "soon" };
  }

  const { done } = goalProgress(goal);
  if (done > 0) return { id: "in_progress", label: "В работе", tone: "active" };
  if (days === null) return { id: "no_deadline", label: "Без срока", tone: "idle" };

  return { id: "not_started", label: "Не начата", tone: "idle" };
}

// ---------------------------------------------------------------------------
// Filtering and sorting
// ---------------------------------------------------------------------------

export type GoalFilterId =
  | "all"
  | "active"
  | "today"
  | "overdue"
  | "completed"
  | "no_deadline";

export const GOAL_FILTERS: { id: GoalFilterId; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "today", label: "Сегодня" },
  { id: "overdue", label: "Просроченные" },
  { id: "completed", label: "Выполненные" },
  { id: "no_deadline", label: "Без срока" },
];

export function matchesFilter(goal: GoalItem, filter: GoalFilterId): boolean {
  const status = goalStatus(goal).id;

  switch (filter) {
    case "all":
      return true;
    case "active":
      return !goal.isCompleted;
    case "today":
      return status === "today";
    case "overdue":
      return status === "overdue";
    case "completed":
      return goal.isCompleted;
    case "no_deadline":
      return !goal.isCompleted && goal.targetDate === null;
  }
}

export function countByFilter(goals: GoalItem[], filter: GoalFilterId): number {
  return goals.filter((goal) => matchesFilter(goal, filter)).length;
}

export type GoalSortId = "deadline" | "progress" | "created" | "title";

// One word each, because the control sits beside the search field on a 390px
// screen and "По дате создания" pushed the search placeholder out of view. The
// sort icon next to it supplies the "по ..." the labels drop.
export const GOAL_SORTS: { id: GoalSortId; label: string }[] = [
  { id: "deadline", label: "Дедлайн" },
  { id: "progress", label: "Прогресс" },
  { id: "created", label: "Создано" },
  { id: "title", label: "Название" },
];

/**
 * Sorting never reorders completion: a finished goal always sits below an
 * unfinished one, whatever the chosen key. Letting "по названию" interleave
 * done and not-done would bury the work that still needs doing.
 *
 * Every comparison falls back to creation order so the list can't reshuffle
 * between renders for no visible reason.
 *
 * `pinnedActiveId` sorts one goal as though it were still unfinished. That is
 * what keeps a goal being ticked off in place long enough for its completion
 * animation to be seen: without it, the optimistic isCompleted flip drops the
 * card to the bottom of the list on the very next frame, and on a long list the
 * whole celebration plays somewhere below the fold.
 */
export function sortGoals(
  goals: GoalItem[],
  sort: GoalSortId,
  pinnedActiveId?: string | null,
): GoalItem[] {
  const byCreated = (a: GoalItem, b: GoalItem) => a.createdAt.localeCompare(b.createdAt);
  const isDone = (goal: GoalItem) => goal.isCompleted && goal.id !== pinnedActiveId;

  return [...goals].sort((a, b) => {
    if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;

    switch (sort) {
      case "deadline": {
        // An undated goal has no claim on "sooner", so it sorts last.
        if (a.targetDate && b.targetDate) {
          const diff = a.targetDate.localeCompare(b.targetDate);
          return diff !== 0 ? diff : byCreated(a, b);
        }
        if (a.targetDate) return -1;
        if (b.targetDate) return 1;
        return byCreated(a, b);
      }
      case "progress": {
        const diff = goalProgress(b).ratio - goalProgress(a).ratio;
        return diff !== 0 ? diff : byCreated(a, b);
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

export function matchesSearch(goal: GoalItem, query: string): boolean {
  const trimmed = query.trim().toLocaleLowerCase("ru");
  if (!trimmed) return true;
  return goal.title.toLocaleLowerCase("ru").includes(trimmed);
}
