import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import {
  addDays,
  daysBetween,
  diffDays,
  maxDay,
  minDay,
  startOfMonth,
  startOfWeek,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import {
  expectedInRange,
  isScheduledOn,
  isTrackedDaily,
} from "@/features/appearance/lib/schedule";
import { AREA_ORDER } from "@/features/appearance/lib/areas";
import type {
  CareArea,
  CareRoutineItem,
  CareStepItem,
} from "@/features/appearance/types";

/**
 * Everything the Внешность screen knows about how care is going.
 *
 * Pure and synchronous, exactly like habits/lib/stats.ts and
 * workouts/lib/stats.ts: nothing here is stored, so un-ticking a step is right
 * on the next render rather than after a refetch — the same reason Goal has no
 * `progress` column.
 */

/** The trailing window adherence is measured over. Matches habits. */
export const ADHERENCE_DAYS = 30;

// ---------------------------------------------------------------------------
// The completion rule
// ---------------------------------------------------------------------------

/**
 * The steps that existed on a given day.
 *
 * This clipping is what makes the checklist safe to edit. Completion is derived
 * from steps, so without it, adding "SPF" to a morning routine today would
 * reach back and mark every previously-finished day incomplete — a screen full
 * of newly-broken streaks for doing nothing wrong.
 */
export function activeStepsOn(routine: CareRoutineItem, day: CalendarDay): CareStepItem[] {
  return routine.steps.filter((step) => diffDays(step.createdDay, day) >= 0);
}

export function isStepDoneOn(step: CareStepItem, day: CalendarDay): boolean {
  return step.log.includes(day);
}

/**
 * Whether the routine counts as done on a day. The one place this is decided.
 *
 * A routine with a checklist is done when every step that existed by then is
 * ticked; a routine without one is done when it carries its own log row. Two
 * shapes, one rule, and no stored flag that could disagree with either — see
 * the note on AppearanceRoutineLog in schema.prisma for why both tables exist
 * but never both apply.
 */
export function doneOn(routine: CareRoutineItem, day: CalendarDay): boolean {
  const steps = activeStepsOn(routine, day);
  if (steps.length > 0) return steps.every((step) => isStepDoneOn(step, day));
  return routine.log.includes(day);
}

/** How far through the checklist a day is: "2 из 4". Total 0 means no list. */
export interface StepProgress {
  done: number;
  total: number;
  ratio: number;
}

export function stepProgressOn(routine: CareRoutineItem, day: CalendarDay): StepProgress {
  const steps = activeStepsOn(routine, day);
  const done = steps.filter((step) => isStepDoneOn(step, day)).length;
  return {
    done,
    total: steps.length,
    ratio: steps.length === 0 ? 0 : done / steps.length,
  };
}

/** Every day inside the window on which the routine was completed, ascending. */
export function completedDays(
  routine: CareRoutineItem,
  from: CalendarDay,
  to: CalendarDay,
): CalendarDay[] {
  const start = maxDay(from, routine.createdDay);
  if (diffDays(start, to) < 0) return [];
  return daysBetween(start, to).filter((day) => doneOn(routine, day));
}

// ---------------------------------------------------------------------------
// Per-routine statistics
// ---------------------------------------------------------------------------

export interface CareWeekProgress {
  done: number;
  target: number;
  ratio: number;
}

export interface CareRoutineStats {
  isDoneToday: boolean;
  /** Whether today is owed. A weekly routine is due until its quota is met. */
  isDueToday: boolean;
  /** Today's checklist state — total 0 when the routine has no steps. */
  today: StepProgress;
  currentStreak: number;
  bestStreak: number;
  streakUnit: "day" | "week";
  week: CareWeekProgress;
  /** Done / owed over the trailing 30 days, 0–1. */
  adherence: number;
  /** Completions inside the loaded window. */
  totalDone: number;
  /** Last day it was completed, inside the window. */
  lastDay: CalendarDay | null;
}

/**
 * A "unit" is one thing the streak counts — a scheduled day, or a whole week
 * for a quota routine. Same construction as habits, and for the same reasons:
 * `pending` marks the unit the user is still inside, so a routine due tonight
 * and not yet done at 9am neither extends nor breaks the streak.
 */
interface StreakUnit {
  met: boolean;
  pending: boolean;
}

function buildUnits(
  routine: CareRoutineItem,
  today: CalendarDay,
  windowStart: CalendarDay,
): StreakUnit[] {
  const from = maxDay(windowStart, routine.createdDay);
  if (diffDays(from, today) < 0) return [];

  if (isTrackedDaily(routine.schedule)) {
    return daysBetween(from, today)
      .filter((day) => isScheduledOn(routine.schedule, day))
      .map((day) => {
        const met = doneOn(routine, day);
        return { met, pending: !met && day === today };
      });
  }

  const quota = routine.schedule.kind === "weekly" ? routine.schedule.timesPerWeek : 1;
  const currentWeek = startOfWeek(today);
  const units: StreakUnit[] = [];

  for (
    let week = startOfWeek(from);
    diffDays(week, currentWeek) >= 0;
    week = addDays(week, 7)
  ) {
    const kept = daysBetween(week, addDays(week, 6)).filter((day) => doneOn(routine, day)).length;
    const met = kept >= quota;

    // A week the user never had a fair shot at cannot count as a miss: the
    // current one, and the creation week when the routine started partway
    // through it.
    const available = daysBetween(maxDay(week, from), minDay(addDays(week, 6), today)).length;
    units.push({ met, pending: !met && (week === currentWeek || available < quota) });
  }

  return units;
}

function trailingStreak(units: StreakUnit[]): number {
  let index = units.length - 1;
  if (index >= 0 && units[index].pending) index -= 1;

  let streak = 0;
  for (; index >= 0 && units[index].met; index -= 1) streak += 1;
  return streak;
}

function longestStreak(units: StreakUnit[]): number {
  let best = 0;
  let run = 0;

  for (const unit of units) {
    if (unit.met) {
      run += 1;
      best = Math.max(best, run);
    } else if (!unit.pending) {
      run = 0;
    }
  }

  return best;
}

function weekProgress(routine: CareRoutineItem, today: CalendarDay): CareWeekProgress {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const done = daysBetween(weekStart, weekEnd).filter((day) => doneOn(routine, day)).length;
  const target =
    routine.schedule.kind === "weekly"
      ? routine.schedule.timesPerWeek
      : expectedInRange(routine.schedule, weekStart, weekEnd);

  return { done, target, ratio: target === 0 ? 0 : Math.min(1, done / target) };
}

function adherenceOf(
  routine: CareRoutineItem,
  today: CalendarDay,
  windowStart: CalendarDay,
): number {
  const from = maxDay(
    maxDay(windowStart, routine.createdDay),
    addDays(today, -(ADHERENCE_DAYS - 1)),
  );
  if (diffDays(from, today) < 0) return 0;

  const expected = expectedInRange(routine.schedule, from, today);
  if (expected === 0) return 0;

  const done = daysBetween(from, today).filter((day) => doneOn(routine, day)).length;
  return Math.min(1, done / expected);
}

export function routineStats(
  routine: CareRoutineItem,
  today: CalendarDay,
  windowStart: CalendarDay,
): CareRoutineStats {
  const units = buildUnits(routine, today, windowStart);
  const week = weekProgress(routine, today);
  const done = completedDays(routine, windowStart, today);

  const isDueToday =
    routine.schedule.kind === "weekly"
      ? week.done < week.target
      : isScheduledOn(routine.schedule, today);

  return {
    isDoneToday: doneOn(routine, today),
    isDueToday,
    today: stepProgressOn(routine, today),
    currentStreak: trailingStreak(units),
    bestStreak: longestStreak(units),
    streakUnit: isTrackedDaily(routine.schedule) ? "day" : "week",
    week,
    adherence: adherenceOf(routine, today, windowStart),
    totalDone: done.length,
    lastDay: done.length > 0 ? done[done.length - 1] : null,
  };
}

/**
 * What one day looks like in a calendar cell.
 *
 * "unscheduled" is its own state and not a shade of "missed" for the same
 * reason it is in habits: a Mon/Thu routine owes nothing on Sunday, and
 * painting that red would make every such routine look permanently broken.
 * "partial" is new here — a checklist half-ticked is genuinely different from
 * one never started, and it is the state a user most wants to see on a
 * calendar.
 */
export type CareDayState =
  | "done"
  | "partial"
  | "missed"
  | "unscheduled"
  | "future"
  | "before";

export function dayState(
  routine: CareRoutineItem,
  day: CalendarDay,
  today: CalendarDay,
): CareDayState {
  if (diffDays(routine.createdDay, day) < 0) return "before";
  if (doneOn(routine, day)) return "done";
  if (diffDays(day, today) < 0) return "future";

  const progress = stepProgressOn(routine, day);
  if (progress.done > 0) return "partial";

  // Today is still in progress: it has not been missed until it is over.
  if (day === today) return "unscheduled";
  return isScheduledOn(routine.schedule, day) ? "missed" : "unscheduled";
}

// ---------------------------------------------------------------------------
// Section-wide statistics
// ---------------------------------------------------------------------------

export interface CareRangeStats {
  from: CalendarDay;
  to: CalendarDay;
  /** Routines being tracked. Archived ones owe nothing and are excluded. */
  activeRoutines: number;
  /** Completions the schedules asked for, clipped to each creation day. */
  expected: number;
  /** Completions that actually happened. */
  done: number;
  /** done / expected, clamped. 0 when nothing was owed. */
  adherence: number;
  /** Days on which every routine due that day was completed. */
  perfectDays: number;
  /** Days with at least one completion. */
  activeDays: number;
}

/**
 * The section's adherence over an arbitrary range — the shape both the weekly
 * and the monthly card read, so "за неделю" and "за месяц" can never be two
 * different calculations that disagree at the boundary.
 *
 * Archived routines are excluded from both sides: they owe nothing, and what
 * they earned before archiving is not evidence about this week.
 */
export function rangeStats(
  routines: CareRoutineItem[],
  from: CalendarDay,
  to: CalendarDay,
): CareRangeStats {
  const active = routines.filter((routine) => routine.archivedAt === null);
  const days = daysBetween(from, to);

  const expected = active.reduce((total, routine) => {
    const start = maxDay(from, routine.createdDay);
    if (diffDays(start, to) < 0) return total;
    return total + expectedInRange(routine.schedule, start, to);
  }, 0);

  const done = active.reduce(
    (total, routine) => total + completedDays(routine, from, to).length,
    0,
  );

  let perfectDays = 0;
  let activeDays = 0;

  for (const day of days) {
    const dueToday = active.filter(
      (routine) =>
        diffDays(routine.createdDay, day) >= 0 && isScheduledOn(routine.schedule, day),
    );
    const doneToday = active.filter(
      (routine) => diffDays(routine.createdDay, day) >= 0 && doneOn(routine, day),
    );

    if (doneToday.length > 0) activeDays += 1;
    if (dueToday.length > 0 && dueToday.every((routine) => doneOn(routine, day))) {
      perfectDays += 1;
    }
  }

  return {
    from,
    to,
    activeRoutines: active.length,
    expected,
    done,
    adherence: expected === 0 ? 0 : Math.min(1, done / expected),
    perfectDays,
    activeDays,
  };
}

/** The current calendar week, Monday through today. */
export function weekStats(routines: CareRoutineItem[], today: CalendarDay): CareRangeStats {
  return rangeStats(routines, startOfWeek(today), today);
}

/** The current calendar month, the 1st through today. */
export function monthStats(routines: CareRoutineItem[], today: CalendarDay): CareRangeStats {
  return rangeStats(routines, startOfMonth(today), today);
}

/** Completions per day across the section — what the calendar's cells count. */
export function completionsOn(routines: CareRoutineItem[], day: CalendarDay): number {
  return routines.filter(
    (routine) => diffDays(routine.createdDay, day) >= 0 && doneOn(routine, day),
  ).length;
}

/** Routines due on a day and not yet done — the section's "осталось сегодня". */
export function remainingOn(
  routines: CareRoutineItem[],
  day: CalendarDay,
): CareRoutineItem[] {
  return routines.filter((routine) => {
    if (routine.archivedAt !== null) return false;
    if (diffDays(routine.createdDay, day) < 0) return false;
    if (doneOn(routine, day)) return false;

    if (routine.schedule.kind === "weekly") {
      const week = weekProgress(routine, day);
      return week.done < week.target;
    }
    return isScheduledOn(routine.schedule, day);
  });
}

/**
 * Consecutive days up to and including `today` on which every due routine was
 * completed — the section's own streak, distinct from any single routine's.
 *
 * A day with nothing due does not break the run: a weekday-only routine owes
 * nothing on Sunday, and resetting the streak every weekend would make it
 * meaningless. It does not extend it either, for the same reason a pending
 * unit does not — nothing was proven.
 */
export function careStreak(
  routines: CareRoutineItem[],
  today: CalendarDay,
  windowStart: CalendarDay,
): number {
  const active = routines.filter((routine) => routine.archivedAt === null);
  if (active.length === 0) return 0;

  let streak = 0;
  let day = today;

  while (diffDays(windowStart, day) >= 0) {
    const due = active.filter(
      (routine) =>
        diffDays(routine.createdDay, day) >= 0 && isScheduledOn(routine.schedule, day),
    );

    if (due.length === 0) {
      day = addDays(day, -1);
      continue;
    }

    const allDone = due.every((routine) => doneOn(routine, day));

    if (allDone) {
      streak += 1;
    } else if (day === today) {
      // Today is still in progress. An evening routine not yet done at 9am has
      // not been missed, so today neither extends the streak nor breaks it —
      // the scan simply carries on into yesterday. Collapsing a 40-day run to
      // zero every morning would be both wrong and demoralising, the same
      // reason habit streaks treat a pending unit this way.
    } else {
      break;
    }

    day = addDays(day, -1);
  }

  return streak;
}

// ---------------------------------------------------------------------------
// Per-area breakdown
// ---------------------------------------------------------------------------

export interface AreaStats {
  area: CareArea;
  routines: number;
  expected: number;
  done: number;
  adherence: number;
  photos: number;
}

/**
 * Adherence broken down by body part, worst-first inside the fixed area order.
 *
 * This is the answer to "чем я занимаюсь хуже всего", and it is the number the
 * Coach quotes — so it is computed here once rather than in each consumer.
 */
export function areaBreakdown(
  routines: CareRoutineItem[],
  photoCounts: Map<CareArea, number>,
  from: CalendarDay,
  to: CalendarDay,
): AreaStats[] {
  return AREA_ORDER.map((area) => {
    const inArea = routines.filter(
      (routine) => routine.area === area && routine.archivedAt === null,
    );
    const stats = rangeStats(inArea, from, to);

    return {
      area,
      routines: inArea.length,
      expected: stats.expected,
      done: stats.done,
      adherence: stats.adherence,
      photos: photoCounts.get(area) ?? 0,
    };
  }).filter((stats) => stats.routines > 0 || stats.photos > 0);
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** "12 дней" / "3 недели" — a streak with the right noun for its unit. */
export function formatStreak(value: number, unit: CareRoutineStats["streakUnit"]): string {
  const forms: [string, string, string] =
    unit === "day" ? ["день", "дня", "дней"] : ["неделя", "недели", "недель"];
  return `${value} ${pluralizeRu(value, forms)}`;
}

export function daysWord(count: number): string {
  return pluralizeRu(count, ["день", "дня", "дней"]);
}

export function routinesWord(count: number): string {
  return pluralizeRu(count, ["процедура", "процедуры", "процедур"]);
}
