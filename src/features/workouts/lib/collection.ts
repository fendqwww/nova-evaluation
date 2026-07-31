import type { CalendarDay } from "@/shared/lib/calendar-day";
import { categoryLabel } from "@/features/workouts/lib/categories";
import { workoutStats } from "@/features/workouts/lib/stats";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";

/**
 * Filtering, sorting and search over the workout list — the same split Goals
 * and Habits use, kept out of the view so the counts on the filter chips and
 * the rows they reveal are computed by one function and cannot disagree.
 */

export type WorkoutFilterId = "today" | "all" | "planned" | "archived";

export const WORKOUT_FILTERS: { id: WorkoutFilterId; label: string }[] = [
  { id: "today", label: "На сегодня" },
  { id: "all", label: "Все" },
  { id: "planned", label: "С планом" },
  { id: "archived", label: "Архив" },
];

export function matchesFilter(
  workout: WorkoutItem,
  sessions: WorkoutSessionItem[],
  filter: WorkoutFilterId,
  today: CalendarDay,
  windowStart: CalendarDay,
): boolean {
  const isArchived = workout.archivedAt !== null;

  // Archive is a separate room, not a badge: an archived programme never shows
  // up in a working filter, otherwise "На сегодня" would keep asking for
  // training the user has explicitly stopped.
  if (filter === "archived") return isArchived;
  if (isArchived) return false;

  switch (filter) {
    case "all":
      return true;
    case "planned":
      return workout.weekdayMask !== 0;
    case "today": {
      const stats = workoutStats(workout, sessions, today, windowStart);
      // An open session counts as "today's" whether or not the plan asked for
      // it — an unfinished workout is the most actionable row on the screen.
      return (stats.isPlannedToday && !stats.isDoneToday) || stats.isOpenToday;
    }
  }
}

export function countByFilter(
  workouts: WorkoutItem[],
  sessions: WorkoutSessionItem[],
  filter: WorkoutFilterId,
  today: CalendarDay,
  windowStart: CalendarDay,
): number {
  return workouts.filter((workout) =>
    matchesFilter(workout, sessions, filter, today, windowStart),
  ).length;
}

export type WorkoutSortId = "recent" | "volume" | "streak" | "title";

export const WORKOUT_SORTS: { id: WorkoutSortId; label: string }[] = [
  { id: "recent", label: "Последняя" },
  { id: "volume", label: "Объём" },
  { id: "streak", label: "Серия" },
  { id: "title", label: "Название" },
];

/**
 * Sorting never reorders today's state: a workout still owed today sits above
 * one already finished, whatever the chosen key. Letting "по названию"
 * interleave them would bury the only rows the user came here to act on.
 *
 * Every comparison falls back to creation order so the list cannot reshuffle
 * between renders for no visible reason.
 */
export function sortWorkouts(
  workouts: WorkoutItem[],
  sessions: WorkoutSessionItem[],
  sort: WorkoutSortId,
  today: CalendarDay,
  windowStart: CalendarDay,
): WorkoutItem[] {
  const byCreated = (a: WorkoutItem, b: WorkoutItem) => a.createdAt.localeCompare(b.createdAt);
  const statsOf = (workout: WorkoutItem) =>
    workoutStats(workout, sessions, today, windowStart);

  const settled = (workout: WorkoutItem) => {
    if (workout.archivedAt !== null) return 2;
    const stats = statsOf(workout);
    if (stats.isOpenToday) return 0;
    return stats.isDoneToday || !stats.isPlannedToday ? 1 : 0;
  };

  return [...workouts].sort((a, b) => {
    const rank = settled(a) - settled(b);
    if (rank !== 0) return rank;

    switch (sort) {
      case "recent": {
        // Never trained sorts last rather than first — an empty string would
        // otherwise win every comparison against a real date.
        const left = statsOf(a).lastDay ?? "";
        const right = statsOf(b).lastDay ?? "";
        const diff = right.localeCompare(left);
        return diff !== 0 ? diff : byCreated(a, b);
      }
      case "volume": {
        const diff = statsOf(b).volumeKg - statsOf(a).volumeKg;
        return diff !== 0 ? diff : byCreated(a, b);
      }
      case "streak": {
        const diff = statsOf(b).currentStreak - statsOf(a).currentStreak;
        return diff !== 0 ? diff : byCreated(a, b);
      }
      case "title": {
        const diff = a.title.localeCompare(b.title, "ru");
        return diff !== 0 ? diff : byCreated(a, b);
      }
    }
  });
}

/** Title, category and exercise names — searching for "жим" must find it. */
export function matchesSearch(workout: WorkoutItem, query: string): boolean {
  const trimmed = query.trim().toLocaleLowerCase("ru");
  if (!trimmed) return true;

  const haystack = [
    workout.title,
    categoryLabel(workout.category),
    ...workout.exercises.filter((item) => item.archivedAt === null).map((item) => item.name),
  ]
    .join(" ")
    .toLocaleLowerCase("ru");

  return haystack.includes(trimmed);
}

/** Sessions newest-first, for the history list. */
export function sortSessionsDesc(sessions: WorkoutSessionItem[]): WorkoutSessionItem[] {
  return [...sessions].sort((a, b) => b.day.localeCompare(a.day));
}
