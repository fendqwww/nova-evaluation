import type { CalendarDay } from "@/shared/lib/calendar-day";
import { habitStats } from "@/features/habits/lib/stats";
import type { HabitItem } from "@/features/habits/types";

/**
 * Filtering, sorting and search over the habit list — the same split Goals
 * uses, kept out of the view so the counts on the filter chips and the rows
 * they reveal are computed by one function and cannot disagree.
 */

export type HabitFilterId = "today" | "all" | "kept" | "archived";

export const HABIT_FILTERS: { id: HabitFilterId; label: string }[] = [
  { id: "today", label: "На сегодня" },
  { id: "all", label: "Все" },
  { id: "kept", label: "Выполнены" },
  { id: "archived", label: "Архив" },
];

export function matchesFilter(
  habit: HabitItem,
  filter: HabitFilterId,
  today: CalendarDay,
  windowStart: CalendarDay,
): boolean {
  const isArchived = habit.archivedAt !== null;

  // Archive is a separate room, not a badge: an archived habit never shows up
  // in a working filter, otherwise "На сегодня" would keep asking for habits
  // the user has explicitly stopped.
  if (filter === "archived") return isArchived;
  if (isArchived) return false;

  const stats = habitStats(habit, today, windowStart);

  switch (filter) {
    case "all":
      return true;
    case "today":
      return stats.isDueToday && !stats.isDoneToday;
    case "kept":
      return stats.isDoneToday;
  }
}

export function countByFilter(
  habits: HabitItem[],
  filter: HabitFilterId,
  today: CalendarDay,
  windowStart: CalendarDay,
): number {
  return habits.filter((habit) => matchesFilter(habit, filter, today, windowStart)).length;
}

export type HabitSortId = "streak" | "adherence" | "created" | "title";

export const HABIT_SORTS: { id: HabitSortId; label: string }[] = [
  { id: "streak", label: "Серия" },
  { id: "adherence", label: "Регулярность" },
  { id: "created", label: "Создано" },
  { id: "title", label: "Название" },
];

/**
 * Sorting never reorders today's state: a habit still owed today sits above one
 * already kept, whatever the chosen key. Letting "по названию" interleave them
 * would bury the only rows the user came here to act on.
 *
 * Every comparison falls back to creation order so the list cannot reshuffle
 * between renders for no visible reason.
 */
export function sortHabits(
  habits: HabitItem[],
  sort: HabitSortId,
  today: CalendarDay,
  windowStart: CalendarDay,
): HabitItem[] {
  const byCreated = (a: HabitItem, b: HabitItem) => a.createdAt.localeCompare(b.createdAt);
  const settled = (habit: HabitItem) => {
    if (habit.archivedAt !== null) return 2;
    const stats = habitStats(habit, today, windowStart);
    return stats.isDoneToday || !stats.isDueToday ? 1 : 0;
  };

  return [...habits].sort((a, b) => {
    const rank = settled(a) - settled(b);
    if (rank !== 0) return rank;

    switch (sort) {
      case "streak": {
        const diff =
          habitStats(b, today, windowStart).currentStreak -
          habitStats(a, today, windowStart).currentStreak;
        return diff !== 0 ? diff : byCreated(a, b);
      }
      case "adherence": {
        const diff =
          habitStats(b, today, windowStart).adherence -
          habitStats(a, today, windowStart).adherence;
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

export function matchesSearch(habit: HabitItem, query: string): boolean {
  const trimmed = query.trim().toLocaleLowerCase("ru");
  if (!trimmed) return true;
  return habit.title.toLocaleLowerCase("ru").includes(trimmed);
}

/** How many of today's due habits are already kept — the header's read-out. */
export function todayProgress(
  habits: HabitItem[],
  today: CalendarDay,
  windowStart: CalendarDay,
): { done: number; total: number } {
  const active = habits.filter((habit) => habit.archivedAt === null);
  const relevant = active
    .map((habit) => habitStats(habit, today, windowStart))
    .filter((stats) => stats.isDueToday || stats.isDoneToday);

  return {
    done: relevant.filter((stats) => stats.isDoneToday).length,
    total: relevant.length,
  };
}
