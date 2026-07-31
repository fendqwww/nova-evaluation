import { z } from "zod";
import { DAY_PATTERN, isValidDay } from "@/shared/lib/calendar-day";
import type { MealSlot } from "@/features/nutrition/types";

export const FOOD_NAME_MAX = 80;
export const TEMPLATE_NAME_MAX = 60;

/** Ceilings that make a forged payload harmless rather than merely unlikely. */
export const CALORIES_PER_100_MAX = 900;
export const MACRO_PER_100_MAX = 100;
export const AMOUNT_G_MAX = 5000;
export const WATER_ML_MAX = 10_000;
export const TEMPLATE_ITEMS_MAX = 20;
export const GOAL_CALORIES_MAX = 10_000;
export const GOAL_MACRO_MAX = 1000;

export const MEAL_SLOTS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const satisfies readonly MealSlot[];

export const mealSlotSchema = z.enum(MEAL_SLOTS);

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

/**
 * A day being written to. Validated as a real date, not merely a well-formed
 * one — "2026-02-30" matches the pattern and would otherwise reach the column
 * as March 2nd. Same schema as workouts/schemas.ts; kept local rather than
 * imported so this feature does not reach across another feature's module for
 * a two-line schema.
 */
export const calendarDaySchema = z
  .string()
  .regex(DAY_PATTERN, "Некорректная дата")
  .refine(isValidDay, "Некорректная дата");

export const foodNameSchema = z
  .string()
  .trim()
  .min(1, "Введите название")
  .max(FOOD_NAME_MAX, "Слишком длинное название");

/** What the create/edit food form collects. */
export const foodDraftSchema = z.object({
  name: foodNameSchema,
  caloriesPer100: z
    .number()
    .min(0, "Не может быть отрицательным")
    .max(CALORIES_PER_100_MAX, "Слишком большое значение"),
  proteinPer100: z
    .number()
    .min(0, "Не может быть отрицательным")
    .max(MACRO_PER_100_MAX, "Слишком большое значение"),
  fatPer100: z
    .number()
    .min(0, "Не может быть отрицательным")
    .max(MACRO_PER_100_MAX, "Слишком большое значение"),
  carbsPer100: z
    .number()
    .min(0, "Не может быть отрицательным")
    .max(MACRO_PER_100_MAX, "Слишком большое значение"),
});

export type FoodDraft = z.infer<typeof foodDraftSchema>;

/** One food logged into the diary. */
export const entryDraftSchema = z.object({
  foodId: z.string().min(1),
  mealSlot: mealSlotSchema,
  day: calendarDaySchema,
  amountG: z
    .number()
    .min(1, "Минимум 1 г")
    .max(AMOUNT_G_MAX, "Слишком большое количество"),
});

export type EntryDraft = z.infer<typeof entryDraftSchema>;

export const templateItemDraftSchema = z.object({
  foodId: z.string().min(1),
  amountG: z
    .number()
    .min(1, "Минимум 1 г")
    .max(AMOUNT_G_MAX, "Слишком большое количество"),
});

export const templateDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Введите название")
    .max(TEMPLATE_NAME_MAX, "Слишком длинное название"),
  mealSlot: mealSlotSchema,
  items: z
    .array(templateItemDraftSchema)
    .min(1, "Добавьте хотя бы один продукт")
    .max(TEMPLATE_ITEMS_MAX, "Слишком много продуктов"),
});

export type TemplateDraft = z.infer<typeof templateDraftSchema>;

/** The daily target, as the goal form collects it. */
export const goalDraftSchema = z.object({
  calories: z.number().int().min(0).max(GOAL_CALORIES_MAX, "Слишком большое значение"),
  proteinG: z.number().int().min(0).max(GOAL_MACRO_MAX, "Слишком большое значение"),
  fatG: z.number().int().min(0).max(GOAL_MACRO_MAX, "Слишком большое значение"),
  carbsG: z.number().int().min(0).max(GOAL_MACRO_MAX, "Слишком большое значение"),
  waterMl: z.number().int().min(0).max(WATER_ML_MAX, "Слишком большое значение"),
});

export type GoalDraft = z.infer<typeof goalDraftSchema>;

/** One water addition — positive to add, negative to correct a misstap. */
export const waterDeltaSchema = z
  .number()
  .int()
  .min(-WATER_ML_MAX, "Слишком большое значение")
  .max(WATER_ML_MAX, "Слишком большое значение");
