import type { CalendarDay } from "@/shared/lib/calendar-day";

/**
 * Which meal an entry or template belongs to.
 *
 * A closed union rather than free-form tags, the same reasoning WorkoutCategory
 * uses: the slot drives the icon, the grouping in the diary and the order meals
 * are shown in. Stored as a plain String column (SQLite has no enums) and
 * validated by a zod union in schemas.ts.
 */
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * A food in the user's own catalogue — created by them, or favourited by them.
 * There is no shared catalogue to search; see the note on NutritionFood in
 * schema.prisma for why.
 *
 * Macros are per 100 g / 100 ml, the units on a nutrition label, so a logged
 * amount multiplies directly into a real total without a serving-size lookup.
 */
export interface NutritionFoodItem {
  id: string;
  name: string;
  caloriesPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  isFavorite: boolean;
  /** ISO instant, or null while the food is active. */
  archivedAt: string | null;
}

/**
 * One thing eaten: a food, an amount, a meal, a day.
 *
 * `food` travels with the entry rather than just a `foodId`, because the diary
 * and the meal groups render the name and macros directly — the alternative is
 * every reader re-joining against the food list it was already given.
 */
export interface NutritionEntryItem {
  id: string;
  food: NutritionFoodItem;
  mealSlot: MealSlot;
  day: CalendarDay;
  /** Grams (or millilitres for a drink logged the same way). */
  amountG: number;
  createdAt: string;
}

/** One line inside a meal template: a food and the amount it contributes. */
export interface NutritionMealTemplateItemDraft {
  foodId: string;
  amountG: number;
}

/**
 * A reusable set of foods a user logs together often. Applying one writes
 * ordinary NutritionEntry rows — nothing about a diary day points back at the
 * template that seeded it.
 */
export interface NutritionMealTemplateItem {
  foodId: string;
  /** Null when the food it points at has since been archived or deleted. */
  food: NutritionFoodItem | null;
  amountG: number;
  position: number;
}

export interface NutritionMealTemplateItemInput {
  foodId: string;
  amountG: number;
}

export interface NutritionMealTemplate {
  id: string;
  name: string;
  mealSlot: MealSlot;
  items: NutritionMealTemplateItem[];
}

/**
 * The user's daily target. One row, mutable in place — a current setting, not
 * a history of settings. Zero means "not set" for each macro independently.
 */
export interface NutritionGoalItem {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
}

/** Water logged so far on one day. Absent day reads as 0, not a missing row. */
export interface NutritionWaterItem {
  day: CalendarDay;
  amountMl: number;
}

/**
 * One fetch of the Питание screen.
 *
 * `entries` and `water` are loaded for a bounded window, the same convention
 * WorkoutsSnapshot uses for sessions: a user logging every meal for years does
 * not ship an unbounded array, and anything measured over the window is
 * labelled with it in the UI rather than passed off as all-time.
 */
export interface NutritionSnapshot {
  today: CalendarDay;
  windowStart: CalendarDay;
  foods: NutritionFoodItem[];
  entries: NutritionEntryItem[];
  water: NutritionWaterItem[];
  templates: NutritionMealTemplate[];
  goal: NutritionGoalItem;
}
