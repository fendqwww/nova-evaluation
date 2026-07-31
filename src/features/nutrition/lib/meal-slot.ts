import { MEAL_SLOTS } from "@/features/nutrition/schemas";
import type { MealSlot } from "@/features/nutrition/types";

export function isMealSlot(value: string): value is MealSlot {
  return (MEAL_SLOTS as readonly string[]).includes(value);
}
