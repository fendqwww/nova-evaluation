import "server-only";
import { db } from "@/server/db";
import {
  addDays,
  dateToDay,
  dayInZone,
  dayToDate,
  daysBetween,
  diffDays,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { listRoutines } from "@/features/appearance/server/appearance.repository";
import { completedDays } from "@/features/appearance/lib/stats";
import type { ActivityDay, ProfileStreak, ProfileTotals } from "@/features/profile/types";

/**
 * Lifetime aggregates for the Профиль screen.
 *
 * Every function here folds the caller's userId into the where-clause, the same
 * ownership rule every other repository in the app follows. Two things are
 * specific to this one:
 *
 *   1. Nothing is stored. Totals, the streak and the chart are all COUNTs and
 *      GROUP BYs over rows that already exist, for the same reason Goal has no
 *      `progress` column — a stored tally is a second source of truth that
 *      drifts the moment a day is un-ticked.
 *   2. It reads across sections, like settings.repository.ts does, because
 *      "сколько всего ты сделал" is a question no single section can answer.
 */

/**
 * Everything the user has ever done, counted.
 *
 * `careDone` is the one that cannot be a COUNT: a routine with a checklist is
 * complete only when every step that existed by that day is ticked, and that
 * rule lives in features/appearance/lib/stats.ts. So the routines are loaded
 * through the section's own listRoutines and run through the same derivation
 * the section's screens use — which is what guarantees the number here matches
 * the one the user sees over there. Same call getAppearanceAdherence makes.
 */
export async function getProfileTotals(
  userId: string,
  timezone: string,
  today: CalendarDay,
  since: CalendarDay,
): Promise<ProfileTotals> {
  const [habitTicks, tasksCompleted, goalsCompleted, workouts, nutritionDays, photos, routines] =
    await Promise.all([
      db.habitLog.count({ where: { habit: { userId } } }),
      db.task.count({ where: { userId, isCompleted: true } }),
      db.goal.count({ where: { userId, isCompleted: true } }),
      // Finished only. An open session is a workout in progress, not one that
      // happened — the same distinction the Life Score draws.
      db.workoutSession.count({
        where: { workout: { userId }, completedAt: { not: null } },
      }),
      db.nutritionEntry.findMany({
        where: { userId },
        distinct: ["day"],
        select: { day: true },
      }),
      db.appearancePhoto.count({ where: { userId } }),
      listRoutines(userId, timezone, since),
    ]);

  const careDone = routines.reduce(
    (total, routine) => total + completedDays(routine, since, today).length,
    0,
  );

  return {
    habitTicks,
    tasksCompleted,
    goalsCompleted,
    workouts,
    nutritionDays: nutritionDays.length,
    careDone,
    photos,
  };
}

/**
 * One row per day in the window, counting everything the user did that day.
 *
 * Bucketed in JavaScript rather than by a GROUP BY, and that is not laziness:
 * three of the five sources store a CalendarDay as UTC midnight while
 * Task.completedAt is a real instant that has to be resolved in the user's own
 * zone before it belongs to a day at all. Doing that in SQL would mean either a
 * raw query per dialect or storing a redundant day column; doing it here keeps
 * one convention and costs a pass over a bounded number of small rows.
 *
 * Gaps are filled with zeros so the chart is a calendar rather than a list of
 * the good days — a week of nothing has to look like a week of nothing.
 */
export async function getActivityDays(
  userId: string,
  timezone: string,
  today: CalendarDay,
  windowDays: number,
): Promise<ActivityDay[]> {
  const from = addDays(today, -(windowDays - 1));
  const fromDate = dayToDate(from);
  // A day in a zone ahead of UTC can start before UTC midnight of that day, so
  // the instant-based query reaches back one extra day and the bucketing below
  // discards anything that lands outside the window.
  const fromInstant = dayToDate(addDays(from, -1));

  const [habitLogs, tasks, sessions, entries, routines] = await Promise.all([
    db.habitLog.findMany({
      where: { habit: { userId }, date: { gte: fromDate } },
      select: { date: true },
    }),
    db.task.findMany({
      where: { userId, isCompleted: true, completedAt: { gte: fromInstant } },
      select: { completedAt: true },
    }),
    db.workoutSession.findMany({
      where: { workout: { userId }, completedAt: { not: null }, day: { gte: fromDate } },
      select: { day: true },
    }),
    db.nutritionEntry.findMany({
      where: { userId, day: { gte: fromDate } },
      select: { day: true },
    }),
    listRoutines(userId, timezone, from),
  ]);

  const counts = new Map<CalendarDay, number>();
  const add = (day: CalendarDay) => {
    if (diffDays(from, day) < 0 || diffDays(day, today) < 0) return;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  };

  for (const log of habitLogs) add(dateToDay(log.date));
  for (const session of sessions) add(dateToDay(session.day));
  for (const entry of entries) add(dateToDay(entry.day));
  for (const task of tasks) {
    if (task.completedAt) add(dayInZone(task.completedAt, timezone));
  }
  for (const routine of routines) {
    for (const day of completedDays(routine, from, today)) add(day);
  }

  return daysBetween(from, today).map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

/**
 * The show-up streak, current and best, from a day series.
 *
 * A pure function over what getActivityDays already produced rather than its
 * own set of queries — the streak and the chart must agree about which days
 * were active, and the cheapest way to guarantee that is for them to be the
 * same data.
 *
 * Today being empty does not break the streak. At 9am a user has usually done
 * nothing yet, and telling them their 40-day run is over because the morning is
 * young would be both wrong and the exact moment they close the app. So the
 * count runs back from today when today is active and from yesterday otherwise;
 * `isTodayActive` is what lets the UI say which case it is.
 */
export function computeStreak(activity: ActivityDay[], today: CalendarDay): ProfileStreak {
  const active = new Set(
    activity.filter((entry) => entry.count > 0).map((entry) => entry.day),
  );

  const isTodayActive = active.has(today);

  let current = 0;
  let cursor = isTodayActive ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Best runs over the whole window in order, so a gap resets it. Clipped to
  // the window like everything else here — see ACTIVITY_WINDOW_DAYS.
  let best = 0;
  let run = 0;
  for (const entry of activity) {
    run = entry.count > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }

  return { current, best: Math.max(best, current), isTodayActive };
}
