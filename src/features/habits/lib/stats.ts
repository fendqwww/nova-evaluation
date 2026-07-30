import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import {
  addDays,
  daysBetween,
  diffDays,
  maxDay,
  minDay,
  startOfWeek,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import {
  expectedInRange,
  isScheduledOn,
  isTrackedDaily,
} from "@/features/habits/lib/schedule";
import type { HabitItem } from "@/features/habits/types";

/** The trailing window adherence is measured over. */
export const ADHERENCE_DAYS = 30;

export interface HabitWeekProgress {
  /** Days kept so far this week. */
  done: number;
  /** Days the schedule asks for this week. */
  target: number;
  /** done / target, clamped to 1. */
  ratio: number;
}

export interface HabitStats {
  isDoneToday: boolean;
  /**
   * Whether today is owed. A weekly habit is "due" until its quota is met —
   * it owes days, just not specific ones.
   */
  isDueToday: boolean;
  /** Consecutive kept units ending now. */
  currentStreak: number;
  /** The longest run inside the loaded window — labelled "за год" in the UI. */
  bestStreak: number;
  /** What a streak counts: days for daily/weekdays, weeks for a weekly quota. */
  streakUnit: "day" | "week";
  week: HabitWeekProgress;
  /** Kept / owed over the trailing 30 days, 0–1. */
  adherence: number;
  /** Total days kept inside the loaded window. */
  totalDone: number;
}

/**
 * A "unit" is one thing the streak counts — a scheduled day, or a whole week
 * for a quota habit.
 *
 * `met` is the only state that extends a streak. `pending` marks the unit the
 * user is still inside: today, or the current week. A pending unit never
 * extends a streak and, crucially, never breaks one either — a habit due today
 * and not yet done at 9am has not been missed, and showing the streak collapse
 * to zero every morning would be both wrong and demoralising.
 */
interface StreakUnit {
  met: boolean;
  pending: boolean;
}

function buildUnits(habit: HabitItem, today: CalendarDay, windowStart: CalendarDay): StreakUnit[] {
  const done = new Set(habit.log);
  // A habit cannot be judged for days before it existed, or for days whose
  // history was not loaded.
  const from = maxDay(windowStart, habit.createdDay);
  if (diffDays(from, today) < 0) return [];

  if (isTrackedDaily(habit.schedule)) {
    return daysBetween(from, today)
      .filter((day) => isScheduledOn(habit.schedule, day))
      .map((day) => {
        const met = done.has(day);
        // Only an *unmet* today is pending. Marking today pending regardless
        // would make trailingStreak skip it, so ticking today would visibly
        // fail to extend the streak until tomorrow.
        return { met, pending: !met && day === today };
      });
  }

  const quota = habit.schedule.kind === "weekly" ? habit.schedule.timesPerWeek : 1;
  const currentWeek = startOfWeek(today);
  const units: StreakUnit[] = [];

  for (
    let week = startOfWeek(from);
    diffDays(week, currentWeek) >= 0;
    week = addDays(week, 7)
  ) {
    const kept = daysBetween(week, addDays(week, 6)).filter((day) => done.has(day)).length;
    const met = kept >= quota;

    // A week the user never had a fair shot at cannot count as a miss. That is
    // the current week (still in progress, whatever today's count is) and the
    // creation week when the habit started partway through it — a habit made on
    // Saturday with a quota of 3 has two days available and would otherwise
    // open its life on a broken streak.
    const available = daysBetween(maxDay(week, from), minDay(addDays(week, 6), today)).length;
    units.push({ met, pending: !met && (week === currentWeek || available < quota) });
  }

  return units;
}

/** Trailing run of met units, skipping a pending one at the very end. */
function trailingStreak(units: StreakUnit[]): number {
  let index = units.length - 1;
  if (index >= 0 && units[index].pending) index -= 1;

  let streak = 0;
  for (; index >= 0 && units[index].met; index -= 1) streak += 1;
  return streak;
}

/** Longest run of met units. A pending unit ends a run without being part of it. */
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

function weekProgress(habit: HabitItem, today: CalendarDay): HabitWeekProgress {
  const done = new Set(habit.log);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const kept = daysBetween(weekStart, weekEnd).filter((day) => done.has(day)).length;
  const target =
    habit.schedule.kind === "weekly"
      ? habit.schedule.timesPerWeek
      : expectedInRange(habit.schedule, weekStart, weekEnd);

  return {
    done: kept,
    target,
    ratio: target === 0 ? 0 : Math.min(1, kept / target),
  };
}

function adherence(habit: HabitItem, today: CalendarDay, windowStart: CalendarDay): number {
  const from = maxDay(maxDay(windowStart, habit.createdDay), addDays(today, -(ADHERENCE_DAYS - 1)));
  if (diffDays(from, today) < 0) return 0;

  const expected = expectedInRange(habit.schedule, from, today);
  if (expected === 0) return 0;

  const done = new Set(habit.log);
  const kept = daysBetween(from, today).filter((day) => done.has(day)).length;

  return Math.min(1, kept / expected);
}

/**
 * Everything the UI knows about how a habit is going, derived from its log.
 *
 * Pure and synchronous by design: the same function runs against the optimistic
 * cache the instant a day is ticked, so the streak, the ring and the week strip
 * all move together on that frame instead of waiting for a refetch.
 */
export function habitStats(
  habit: HabitItem,
  today: CalendarDay,
  windowStart: CalendarDay,
): HabitStats {
  const units = buildUnits(habit, today, windowStart);
  const week = weekProgress(habit, today);
  const isDoneToday = habit.log.includes(today);

  const isDueToday =
    habit.schedule.kind === "weekly"
      ? week.done < week.target
      : isScheduledOn(habit.schedule, today);

  return {
    isDoneToday,
    isDueToday,
    currentStreak: trailingStreak(units),
    bestStreak: longestStreak(units),
    streakUnit: isTrackedDaily(habit.schedule) ? "day" : "week",
    week,
    adherence: adherence(habit, today, windowStart),
    totalDone: habit.log.length,
  };
}

/**
 * What one day looks like in a week strip or a month grid.
 *
 * "unscheduled" has to be its own state and not a shade of "missed": a
 * weekday-only habit owes nothing on Sunday, and painting that red would make
 * every such habit look permanently broken. A weekly-quota habit has no owed
 * days at all, so an unkept day inside it is "unscheduled" rather than a miss —
 * the miss, if there is one, belongs to the week.
 */
export type DayCellState = "kept" | "missed" | "unscheduled" | "future" | "before";

export function dayState(
  habit: HabitItem,
  day: CalendarDay,
  today: CalendarDay,
): DayCellState {
  if (habit.log.includes(day)) return "kept";
  if (diffDays(day, today) < 0) return "future";
  if (diffDays(habit.createdDay, day) < 0) return "before";
  // Today is still in progress: it has not been missed until it is over.
  if (day === today) return "unscheduled";
  return isScheduledOn(habit.schedule, day) ? "missed" : "unscheduled";
}

/** "12 дней" / "3 недели" — a streak with the right noun for its unit. */
export function formatStreak(value: number, unit: HabitStats["streakUnit"]): string {
  const forms: [string, string, string] =
    unit === "day"
      ? ["день", "дня", "дней"]
      : ["неделя", "недели", "недель"];
  return `${value} ${pluralizeRu(value, forms)}`;
}

/** The bare noun, for when the number is set separately at metric scale. */
export function streakUnitNoun(value: number, unit: HabitStats["streakUnit"]): string {
  return unit === "day"
    ? pluralizeRu(value, ["день", "дня", "дней"])
    : pluralizeRu(value, ["неделя", "недели", "недель"]);
}
