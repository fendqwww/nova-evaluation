import {
  addDays,
  daysBetween,
  diffDays,
  startOfWeek,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { MEAL_SLOTS } from "@/features/nutrition/schemas";
import type {
  MealSlot,
  NutritionEntryItem,
  NutritionGoalItem,
  NutritionWaterItem,
} from "@/features/nutrition/types";

/**
 * Everything the UI knows about a day or a range of days, derived from entries.
 *
 * Pure and synchronous, exactly like workouts/lib/stats.ts: nothing here is
 * ever stored, so a corrected amount or a deleted entry is right on the next
 * render rather than after a refetch — the same reason Goal has no `progress`
 * column.
 */

export interface Macros {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

const EMPTY_MACROS: Macros = { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 };

/** What one entry actually contributed, scaled from its food's per-100 rates. */
export function entryMacros(entry: NutritionEntryItem): Macros {
  const scale = entry.amountG / 100;
  return {
    calories: entry.food.caloriesPer100 * scale,
    proteinG: entry.food.proteinPer100 * scale,
    fatG: entry.food.fatPer100 * scale,
    carbsG: entry.food.carbsPer100 * scale,
  };
}

function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    fatG: a.fatG + b.fatG,
    carbsG: a.carbsG + b.carbsG,
  };
}

export function sumMacros(entries: NutritionEntryItem[]): Macros {
  return entries.reduce((total, entry) => addMacros(total, entryMacros(entry)), EMPTY_MACROS);
}

export function entriesOnDay(
  entries: NutritionEntryItem[],
  day: CalendarDay,
): NutritionEntryItem[] {
  return entries.filter((entry) => entry.day === day);
}

export function entriesInRange(
  entries: NutritionEntryItem[],
  from: CalendarDay,
  to: CalendarDay,
): NutritionEntryItem[] {
  return entries.filter((entry) => diffDays(from, entry.day) >= 0 && diffDays(entry.day, to) >= 0);
}

/** Entries for one day, grouped by meal — in the fixed order meals are shown. */
export function groupByMeal(
  entries: NutritionEntryItem[],
): { slot: MealSlot; entries: NutritionEntryItem[] }[] {
  return MEAL_SLOTS.map((slot) => ({
    slot,
    entries: entries.filter((entry) => entry.mealSlot === slot),
  }));
}

export function waterOnDay(water: NutritionWaterItem[], day: CalendarDay): number {
  return water.find((row) => row.day === day)?.amountMl ?? 0;
}

// ---------------------------------------------------------------------------
// Progress against the goal
// ---------------------------------------------------------------------------

export interface MacroProgress {
  value: number;
  goal: number;
  /** 0–1, clamped. 0 when the goal is unset (0) — nothing to divide by. */
  ratio: number;
}

export interface DayProgress {
  day: CalendarDay;
  calories: MacroProgress;
  proteinG: MacroProgress;
  fatG: MacroProgress;
  carbsG: MacroProgress;
  waterMl: MacroProgress;
}

function progressOf(value: number, goal: number): MacroProgress {
  return { value, goal, ratio: goal > 0 ? Math.min(1, value / goal) : 0 };
}

export function dayProgress(
  entries: NutritionEntryItem[],
  water: NutritionWaterItem[],
  goal: NutritionGoalItem,
  day: CalendarDay,
): DayProgress {
  const macros = sumMacros(entriesOnDay(entries, day));
  return {
    day,
    calories: progressOf(Math.round(macros.calories), goal.calories),
    proteinG: progressOf(Math.round(macros.proteinG), goal.proteinG),
    fatG: progressOf(Math.round(macros.fatG), goal.fatG),
    carbsG: progressOf(Math.round(macros.carbsG), goal.carbsG),
    waterMl: progressOf(waterOnDay(water, day), goal.waterMl),
  };
}

// ---------------------------------------------------------------------------
// Weekly statistics
// ---------------------------------------------------------------------------

export interface DaySummary {
  day: CalendarDay;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
}

/** One row per day in the range, ascending — the series a chart reads. */
export function dailySeries(
  entries: NutritionEntryItem[],
  water: NutritionWaterItem[],
  from: CalendarDay,
  to: CalendarDay,
): DaySummary[] {
  return daysBetween(from, to).map((day) => {
    const macros = sumMacros(entriesOnDay(entries, day));
    return {
      day,
      calories: Math.round(macros.calories),
      proteinG: Math.round(macros.proteinG),
      fatG: Math.round(macros.fatG),
      carbsG: Math.round(macros.carbsG),
      waterMl: waterOnDay(water, day),
    };
  });
}

export interface WeekStats {
  /** Days with at least one entry logged, out of seven. */
  daysLogged: number;
  averageCalories: number;
  averageProteinG: number;
  averageFatG: number;
  averageCarbsG: number;
  averageWaterMl: number;
  /** Days the calorie goal was met (within 10% over, no ceiling below). */
  daysOnTarget: number;
}

const ON_TARGET_TOLERANCE = 1.1;

/** The current calendar week (Monday–Sunday) against the goal. */
export function weekStats(
  entries: NutritionEntryItem[],
  water: NutritionWaterItem[],
  goal: NutritionGoalItem,
  today: CalendarDay,
): WeekStats {
  const from = startOfWeek(today);
  const series = dailySeries(entries, water, from, today);
  const loggedDays = series.filter((day) => day.calories > 0 || day.waterMl > 0);
  const count = series.length;

  const onTarget =
    goal.calories > 0
      ? series.filter((day) => day.calories > 0 && day.calories <= goal.calories * ON_TARGET_TOLERANCE)
          .length
      : 0;

  const average = (pick: (day: DaySummary) => number) =>
    count === 0 ? 0 : Math.round(series.reduce((total, day) => total + pick(day), 0) / count);

  return {
    daysLogged: loggedDays.length,
    averageCalories: average((day) => day.calories),
    averageProteinG: average((day) => day.proteinG),
    averageFatG: average((day) => day.fatG),
    averageCarbsG: average((day) => day.carbsG),
    averageWaterMl: average((day) => day.waterMl),
    daysOnTarget: onTarget,
  };
}

/**
 * Consecutive days up to and including `today` with at least one entry logged.
 *
 * An unlogged today is pending, not a break — nobody has logged breakfast at
 * 8am, and a streak that reads zero every morning and returns by lunch is
 * noise. Same rule habits/lib/stats.ts follows for a habit due today.
 */
export function loggingStreak(entries: NutritionEntryItem[], today: CalendarDay): number {
  const loggedDays = new Set(entries.map((entry) => entry.day));
  let streak = 0;
  let day = loggedDays.has(today) ? today : addDays(today, -1);
  while (loggedDays.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
