import { Activity, Dumbbell, HeartPulse, Trophy, Waves, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WORKOUT_CATEGORIES } from "@/features/workouts/schemas";
import type { WorkoutCategory } from "@/features/workouts/types";

/**
 * The six kinds of training, in one place.
 *
 * Categories differ by icon and label only — never by colour. Per globals.css
 * the category tints are already spoken for (Goal purple / Habit orange / Task
 * blue / Health green / Nova AI cyan), so painting six workout types in six
 * hues would make a cardio session read as a Task and a mobility one as a Goal.
 * The whole section wears the health-green chip, which is the tint the design
 * system already reserves for the body.
 */
export interface WorkoutCategoryOption {
  id: WorkoutCategory;
  label: string;
  /** The short form for a card's meta line. */
  short: string;
  icon: LucideIcon;
}

export const WORKOUT_CATEGORY_OPTIONS: WorkoutCategoryOption[] = [
  { id: "strength", label: "Силовая", short: "Силовая", icon: Dumbbell },
  { id: "cardio", label: "Кардио", short: "Кардио", icon: HeartPulse },
  { id: "hiit", label: "Интервальная", short: "Интервальная", icon: Zap },
  { id: "mobility", label: "Растяжка и мобильность", short: "Растяжка", icon: Waves },
  { id: "sport", label: "Спорт", short: "Спорт", icon: Trophy },
  { id: "other", label: "Другое", short: "Другое", icon: Activity },
];

const BY_ID = new Map<string, WorkoutCategoryOption>(
  WORKOUT_CATEGORY_OPTIONS.map((option) => [option.id, option]),
);

/**
 * An unrecognised category degrades to "Другое" rather than throwing: the
 * column is a plain string (SQLite has no enums), so a value written by a
 * future version or a manual edit must still render a workout instead of
 * taking the screen down.
 */
export function categoryOption(category: string): WorkoutCategoryOption {
  return BY_ID.get(category) ?? BY_ID.get("other")!;
}

export function categoryLabel(category: string): string {
  return categoryOption(category).label;
}

export function isWorkoutCategory(value: string): value is WorkoutCategory {
  return (WORKOUT_CATEGORIES as readonly string[]).includes(value);
}
