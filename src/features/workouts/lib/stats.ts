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
import { isPlannedOn, hasPlan, plannedInRange } from "@/features/workouts/lib/plan";
import type {
  WorkoutCategory,
  WorkoutExerciseItem,
  WorkoutItem,
  WorkoutSessionItem,
  WorkoutSetItem,
} from "@/features/workouts/types";

/**
 * Everything the UI knows about how training is going, derived from sessions.
 *
 * Pure and synchronous by design, exactly like habits/lib/stats.ts: the same
 * functions run against the optimistic cache the instant a set is logged, so
 * the volume figure, the completion ring and the calendar all move together on
 * that frame instead of waiting for a refetch. Nothing here is ever stored —
 * a cached tonnage is wrong the moment a set is corrected.
 */

/** The trailing window adherence and the "за месяц" figures are measured over. */
export const ADHERENCE_DAYS = 30;

/**
 * The weekly session target used when a workout carries no plan.
 *
 * Someone who trains without fixed days still has a rhythm, and scoring them at
 * zero for not declaring one would punish a perfectly ordinary way to train.
 * Three sessions a week is the baseline nearly every physical-activity
 * guideline lands on, and it is only ever a fallback — a declared plan always
 * wins over it.
 */
export const DEFAULT_SESSIONS_PER_WEEK = 3;

// ---------------------------------------------------------------------------
// A single session
// ---------------------------------------------------------------------------

export interface SessionStats {
  /** Sets actually logged. */
  setsDone: number;
  /** Sets the plan asked for, across exercises still in it. */
  setsPlanned: number;
  totalReps: number;
  /** Σ reps × weight, in kilograms. Bodyweight sets contribute reps, not load. */
  volumeKg: number;
  /** Heaviest single set of the session. */
  topWeightKg: number;
  /** setsDone / setsPlanned, clamped to 1. Falls back to done-vs-done. */
  ratio: number;
  isCompleted: boolean;
}

export function plannedSetCount(exercises: WorkoutExerciseItem[]): number {
  return activeExercises(exercises).reduce((total, item) => total + item.targetSets, 0);
}

/** Exercises still in the plan — archived ones anchor history, not intent. */
export function activeExercises(exercises: WorkoutExerciseItem[]): WorkoutExerciseItem[] {
  return exercises.filter((exercise) => exercise.archivedAt === null);
}

export function sessionStats(
  session: WorkoutSessionItem,
  workout: WorkoutItem | undefined,
): SessionStats {
  const setsDone = session.sets.length;
  const totalReps = session.sets.reduce((total, set) => total + set.reps, 0);
  const volumeKg = session.sets.reduce((total, set) => total + set.reps * set.weightKg, 0);
  const topWeightKg = session.sets.reduce((top, set) => Math.max(top, set.weightKg), 0);

  const setsPlanned = workout ? plannedSetCount(workout.exercises) : 0;

  return {
    setsDone,
    setsPlanned,
    totalReps,
    volumeKg,
    topWeightKg,
    // A workout whose plan has no sets (an empty programme, or one whose
    // exercises were all archived) still shows honest progress once something
    // is logged, rather than a permanent 0%.
    ratio: setsPlanned > 0 ? Math.min(1, setsDone / setsPlanned) : setsDone > 0 ? 1 : 0,
    isCompleted: session.completedAt !== null,
  };
}

/** Sets of one exercise inside one session, in the order they were performed. */
export function setsOf(session: WorkoutSessionItem, exerciseId: string): WorkoutSetItem[] {
  return session.sets
    .filter((set) => set.exerciseId === exerciseId)
    .sort((a, b) => a.position - b.position);
}

// ---------------------------------------------------------------------------
// One workout
// ---------------------------------------------------------------------------

export interface WorkoutWeekProgress {
  done: number;
  target: number;
  ratio: number;
}

export interface WorkoutStats {
  /** The plan asks for this workout today. Always false without a plan. */
  isPlannedToday: boolean;
  /** A session for today exists and is finished. */
  isDoneToday: boolean;
  /** A session for today exists and is still being logged. */
  isOpenToday: boolean;
  todaySession: WorkoutSessionItem | null;
  /** Completed sessions inside the loaded window. */
  sessionsDone: number;
  /** Last day this workout was completed, inside the window. */
  lastDay: CalendarDay | null;
  week: WorkoutWeekProgress;
  /**
   * Kept / owed over the trailing 30 days, 0–1. Null for a workout with no
   * plan: nothing was owed, so there is no percentage to be honest about.
   */
  adherence: number | null;
  /** Consecutive units met, ending now. */
  currentStreak: number;
  bestStreak: number;
  /** What a streak counts: planned days, or weeks for an unplanned workout. */
  streakUnit: "day" | "week";
  /** Σ volume of every completed session in the window. */
  volumeKg: number;
}

/** Sessions of one workout, ascending by day. */
export function sessionsOf(
  sessions: WorkoutSessionItem[],
  workoutId: string,
): WorkoutSessionItem[] {
  return sessions.filter((session) => session.workoutId === workoutId);
}

/**
 * A "unit" is one thing the streak counts — a planned day, or a whole week for
 * a workout without a plan.
 *
 * `pending` marks the unit the user is still inside: today, or the current
 * week. A pending unit never extends a streak and, crucially, never breaks one
 * either — a session planned for today and not yet done at 9am has not been
 * missed, and watching the streak collapse every morning would be both wrong
 * and demoralising. Same rule as habits, for the same reason.
 */
interface StreakUnit {
  met: boolean;
  pending: boolean;
}

function buildUnits(
  workout: WorkoutItem,
  done: Set<CalendarDay>,
  today: CalendarDay,
  windowStart: CalendarDay,
): StreakUnit[] {
  // A workout cannot be judged for days before it existed, or for days whose
  // history was never loaded.
  const from = maxDay(windowStart, workout.createdDay);
  if (diffDays(from, today) < 0) return [];

  if (hasPlan(workout.weekdayMask)) {
    return daysBetween(from, today)
      .filter((day) => isPlannedOn(workout.weekdayMask, day))
      .map((day) => {
        const met = done.has(day);
        // Only an *unmet* today is pending — marking today pending regardless
        // would make the streak visibly fail to extend when the session is
        // finished, until tomorrow.
        return { met, pending: !met && day === today };
      });
  }

  const currentWeek = startOfWeek(today);
  const units: StreakUnit[] = [];

  for (let week = startOfWeek(from); diffDays(week, currentWeek) >= 0; week = addDays(week, 7)) {
    const met = daysBetween(week, addDays(week, 6)).some((day) => done.has(day));
    // The current week is still in progress whatever it holds so far, and the
    // creation week is not a fair unit either when the workout only existed for
    // part of it.
    const available = daysBetween(maxDay(week, from), minDay(addDays(week, 6), today)).length;
    units.push({ met, pending: !met && (week === currentWeek || available < 7) });
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

/**
 * How many sessions a workout is asked for across a range.
 *
 * A declared plan answers exactly. Without one the baseline is prorated across
 * the range rather than applied whole, so a workout created on Friday is asked
 * for what fits in the days it has actually existed for — otherwise adding a
 * workout would immediately lower the score, which is backwards.
 */
export function expectedSessions(
  weekdayMask: number,
  from: CalendarDay,
  to: CalendarDay,
): number {
  const span = diffDays(from, to) + 1;
  if (span <= 0) return 0;
  if (hasPlan(weekdayMask)) return plannedInRange(weekdayMask, from, to);
  return Math.max(1, Math.round((span / 7) * DEFAULT_SESSIONS_PER_WEEK));
}

export function workoutStats(
  workout: WorkoutItem,
  sessions: WorkoutSessionItem[],
  today: CalendarDay,
  windowStart: CalendarDay,
): WorkoutStats {
  const own = sessionsOf(sessions, workout.id);
  const completed = own.filter((session) => session.completedAt !== null);
  const doneDays = new Set(completed.map((session) => session.day));

  const todaySession = own.find((session) => session.day === today) ?? null;

  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const weekDone = daysBetween(weekStart, weekEnd).filter((day) => doneDays.has(day)).length;
  // Clipped to the creation day, and measured to the end of the week rather
  // than to today: a workout created on Friday is owed Friday to Sunday, not
  // the whole week it did not exist for, and a Sunday session is still part of
  // this week's target when it is read on a Tuesday. Routed through the same
  // expectedSessions() the Life Score uses, so the card and the score cannot
  // disagree about what a week asks for.
  const weekTarget = expectedSessions(
    workout.weekdayMask,
    maxDay(weekStart, workout.createdDay),
    weekEnd,
  );

  const units = buildUnits(workout, doneDays, today, windowStart);

  const adherenceFrom = maxDay(
    maxDay(windowStart, workout.createdDay),
    addDays(today, -(ADHERENCE_DAYS - 1)),
  );
  const owed = hasPlan(workout.weekdayMask)
    ? plannedInRange(workout.weekdayMask, adherenceFrom, today)
    : 0;
  const keptInWindow = daysBetween(adherenceFrom, today).filter((day) =>
    doneDays.has(day),
  ).length;

  const lastCompleted = completed.at(-1) ?? null;

  return {
    isPlannedToday: isPlannedOn(workout.weekdayMask, today),
    isDoneToday: todaySession?.completedAt != null,
    isOpenToday: todaySession !== null && todaySession.completedAt === null,
    todaySession,
    sessionsDone: completed.length,
    lastDay: lastCompleted?.day ?? null,
    week: {
      done: weekDone,
      target: weekTarget,
      ratio: weekTarget === 0 ? 0 : Math.min(1, weekDone / weekTarget),
    },
    adherence: owed === 0 ? null : Math.min(1, keptInWindow / owed),
    currentStreak: trailingStreak(units),
    bestStreak: longestStreak(units),
    streakUnit: hasPlan(workout.weekdayMask) ? "day" : "week",
    volumeKg: completed.reduce(
      (total, session) => total + sessionStats(session, workout).volumeKg,
      0,
    ),
  };
}

// ---------------------------------------------------------------------------
// The whole section
// ---------------------------------------------------------------------------

export interface CategorySlice {
  category: WorkoutCategory;
  count: number;
  /** Share of all sessions in the window, 0–1. */
  ratio: number;
}

export interface OverallStats {
  /** Completed sessions this calendar week. */
  weekDone: number;
  /** Sessions the plans asked for this week, across active workouts. */
  weekTarget: number;
  weekRatio: number;
  /** Completed sessions over the trailing 30 days. */
  monthDone: number;
  /** Completed sessions inside the loaded window. */
  totalDone: number;
  volumeWeekKg: number;
  volumeMonthKg: number;
  totalSetsMonth: number;
  /** Consecutive weeks with at least one session, ending now. */
  weekStreak: number;
  /** Workouts the plan asks for today, minus the ones already finished. */
  plannedToday: number;
  doneToday: number;
  openToday: number;
  /** Sessions per week over the window, to one decimal. */
  averagePerWeek: number;
  byCategory: CategorySlice[];
}

export function overallStats(
  workouts: WorkoutItem[],
  sessions: WorkoutSessionItem[],
  today: CalendarDay,
  windowStart: CalendarDay,
): OverallStats {
  const active = workouts.filter((workout) => workout.archivedAt === null);
  const byId = new Map(workouts.map((workout) => [workout.id, workout]));
  const completed = sessions.filter((session) => session.completedAt !== null);

  const weekStart = startOfWeek(today);
  const monthStart = addDays(today, -(ADHERENCE_DAYS - 1));

  const inRange = (session: WorkoutSessionItem, from: CalendarDay) =>
    diffDays(from, session.day) >= 0;

  const weekSessions = completed.filter((session) => inRange(session, weekStart));
  const monthSessions = completed.filter((session) => inRange(session, monthStart));

  const volumeOf = (list: WorkoutSessionItem[]) =>
    list.reduce(
      (total, session) => total + sessionStats(session, byId.get(session.workoutId)).volumeKg,
      0,
    );

  const weekTarget = active.reduce((total, workout) => {
    const from = maxDay(weekStart, workout.createdDay);
    if (diffDays(from, today) < 0) return total;
    // Measured to the end of the week, not to today: a Friday session is still
    // part of this week's plan on a Tuesday, and clipping the target to today
    // would make every Monday look like a perfect week.
    return total + expectedSessions(workout.weekdayMask, from, addDays(weekStart, 6));
  }, 0);

  const doneDays = new Set(completed.map((session) => session.day));
  let weekStreak = 0;
  for (let week = weekStart; diffDays(windowStart, week) >= 0; week = addDays(week, -7)) {
    const met = daysBetween(week, addDays(week, 6)).some((day) => doneDays.has(day));
    if (met) {
      weekStreak += 1;
      continue;
    }
    // The current week has not failed yet — it is simply not over.
    if (week === weekStart) continue;
    break;
  }

  const counts = new Map<WorkoutCategory, number>();
  for (const session of monthSessions) {
    const workout = byId.get(session.workoutId);
    if (!workout) continue;
    counts.set(workout.category, (counts.get(workout.category) ?? 0) + 1);
  }

  const byCategory: CategorySlice[] = [...counts.entries()]
    .map(([category, count]) => ({
      category,
      count,
      ratio: monthSessions.length === 0 ? 0 : count / monthSessions.length,
    }))
    .sort((a, b) => b.count - a.count);

  /**
   * The average is measured over the time the user has actually been training,
   * not over the whole loaded window. Dividing two sessions by 180 days would
   * report "0,1 в неделю" to someone who started on Monday — technically true
   * about the window, and a plain lie about them. The span starts at the
   * earliest evidence there is (the first session, or the oldest programme if
   * none has been done yet) and never counts less than one week, so a two-day
   * old account reads as "2 в неделю" rather than as 7.
   */
  const earliest = [
    ...completed.map((session) => session.day),
    ...active.map((workout) => workout.createdDay),
  ].reduce((oldest, day) => minDay(oldest, day), today);

  const windowWeeks = Math.max(1, (diffDays(maxDay(windowStart, earliest), today) + 1) / 7);

  const todayStates = active.map((workout) => workoutStats(workout, sessions, today, windowStart));

  return {
    weekDone: weekSessions.length,
    weekTarget,
    weekRatio: weekTarget === 0 ? 0 : Math.min(1, weekSessions.length / weekTarget),
    monthDone: monthSessions.length,
    totalDone: completed.length,
    volumeWeekKg: volumeOf(weekSessions),
    volumeMonthKg: volumeOf(monthSessions),
    totalSetsMonth: monthSessions.reduce((total, session) => total + session.sets.length, 0),
    weekStreak,
    plannedToday: todayStates.filter((stats) => stats.isPlannedToday && !stats.isDoneToday).length,
    doneToday: todayStates.filter((stats) => stats.isDoneToday).length,
    openToday: todayStates.filter((stats) => stats.isOpenToday).length,
    averagePerWeek: Math.round((completed.length / windowWeeks) * 10) / 10,
    byCategory,
  };
}

// ---------------------------------------------------------------------------
// Progress on one exercise
// ---------------------------------------------------------------------------

export interface ExercisePoint {
  day: CalendarDay;
  /** Heaviest set that day. */
  topWeightKg: number;
  volumeKg: number;
  reps: number;
  sets: number;
}

export interface ExerciseProgress {
  points: ExercisePoint[];
  /** Heaviest set ever recorded inside the window. */
  bestWeightKg: number;
  /** Most reps in a single set. */
  bestReps: number;
  bestVolumeKg: number;
  /** Latest day minus the first, in kilograms of top set. */
  weightDeltaKg: number;
  /** True when the latest session set a new heaviest set. */
  isRecordFresh: boolean;
}

/**
 * One exercise's history, day by day.
 *
 * This is what "прогресс" means for training: the same movement, tracked over
 * time. Built from the set rows rather than from anything stored per exercise —
 * a "personal record" column would go stale the moment a mistyped set was
 * corrected, which is exactly the sort of number this codebase refuses to keep.
 */
export function exerciseProgress(
  exerciseId: string,
  sessions: WorkoutSessionItem[],
): ExerciseProgress {
  const points: ExercisePoint[] = [];

  for (const session of sessions) {
    if (session.completedAt === null) continue;
    const sets = setsOf(session, exerciseId);
    if (sets.length === 0) continue;

    points.push({
      day: session.day,
      topWeightKg: sets.reduce((top, set) => Math.max(top, set.weightKg), 0),
      volumeKg: sets.reduce((total, set) => total + set.reps * set.weightKg, 0),
      reps: sets.reduce((total, set) => total + set.reps, 0),
      sets: sets.length,
    });
  }

  points.sort((a, b) => a.day.localeCompare(b.day));

  const bestWeightKg = points.reduce((best, point) => Math.max(best, point.topWeightKg), 0);
  const last = points.at(-1);
  const first = points[0];

  return {
    points,
    bestWeightKg,
    bestReps: sessions.reduce(
      (best, session) =>
        setsOf(session, exerciseId).reduce((inner, set) => Math.max(inner, set.reps), best),
      0,
    ),
    bestVolumeKg: points.reduce((best, point) => Math.max(best, point.volumeKg), 0),
    weightDeltaKg:
      last && first ? Math.round((last.topWeightKg - first.topWeightKg) * 10) / 10 : 0,
    isRecordFresh:
      last !== undefined && bestWeightKg > 0 && last.topWeightKg === bestWeightKg && points.length > 1,
  };
}

/**
 * What one day looks like in a calendar.
 *
 * "unplanned" is its own state and not a shade of "missed": a workout planned
 * for Monday and Thursday owes nothing on Sunday, and painting that red would
 * make every programme look permanently broken.
 */
export type WorkoutDayState =
  | "done"
  | "open"
  | "missed"
  | "planned"
  | "unplanned"
  | "future"
  | "before";

export function dayState(
  workout: WorkoutItem,
  sessions: WorkoutSessionItem[],
  day: CalendarDay,
  today: CalendarDay,
): WorkoutDayState {
  const session = sessions.find(
    (item) => item.workoutId === workout.id && item.day === day,
  );
  if (session) return session.completedAt !== null ? "done" : "open";

  // diffDays is signed from `day` to `today`, so a negative value means the day
  // has not arrived yet.
  if (diffDays(day, today) < 0) return "future";
  if (diffDays(workout.createdDay, day) < 0) return "before";
  // Today is still in progress: it has not been missed until it is over.
  if (day === today) return isPlannedOn(workout.weekdayMask, day) ? "planned" : "unplanned";
  return isPlannedOn(workout.weekdayMask, day) ? "missed" : "unplanned";
}

/** "12 дней" / "3 недели" — a streak with the right noun for its unit. */
export function formatStreak(value: number, unit: WorkoutStats["streakUnit"]): string {
  const forms: [string, string, string] =
    unit === "day" ? ["день", "дня", "дней"] : ["неделя", "недели", "недель"];
  return `${value} ${pluralizeRu(value, forms)}`;
}

/** The bare noun, for when the number is set separately at metric scale. */
export function streakUnitNoun(value: number, unit: WorkoutStats["streakUnit"]): string {
  return unit === "day"
    ? pluralizeRu(value, ["день", "дня", "дней"])
    : pluralizeRu(value, ["неделя", "недели", "недель"]);
}
