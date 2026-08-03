import type { MealSlot, NutritionFoodItem } from "@/features/nutrition/types";

/**
 * A curated set of popular dishes, applied in one tap the same way a saved
 * NutritionMealTemplate is. Not a shared food database — see the note on
 * NutritionFood in schema.prisma for why this app deliberately has none.
 * Applying a preset seeds one ordinary NutritionFood row under the user's own
 * catalogue the first time (see applyQuickTemplate in nutrition.repository.ts);
 * every later log of the same dish reuses that row rather than creating a
 * duplicate, and the user can correct its macros exactly like any food they
 * typed in by hand.
 *
 * Macros are typical values for a home-cooked portion, not a lab measurement —
 * meant to be corrected after logging, the same way a Gemini photo estimate is.
 */
export interface QuickMealTemplate {
  id: string;
  name: string;
  mealSlot: MealSlot;
  /** Grams (or millilitres for the shake), for the default portion size. */
  amountG: number;
  caloriesPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
}

export const QUICK_MEAL_TEMPLATES: QuickMealTemplate[] = [
  { id: "oatmeal", name: "Овсянка", mealSlot: "breakfast", amountG: 300, caloriesPer100: 88, proteinPer100: 3, fatPer100: 1.5, carbsPer100: 15 },
  { id: "omelette", name: "Омлет", mealSlot: "breakfast", amountG: 200, caloriesPer100: 154, proteinPer100: 11, fatPer100: 11, carbsPer100: 2 },
  { id: "fried-eggs", name: "Яичница", mealSlot: "breakfast", amountG: 150, caloriesPer100: 196, proteinPer100: 13, fatPer100: 15, carbsPer100: 1 },
  { id: "cottage-cheese", name: "Творог", mealSlot: "breakfast", amountG: 150, caloriesPer100: 121, proteinPer100: 17, fatPer100: 5, carbsPer100: 3 },
  { id: "yogurt", name: "Йогурт", mealSlot: "breakfast", amountG: 200, caloriesPer100: 66, proteinPer100: 5, fatPer100: 3.2, carbsPer100: 4.7 },
  { id: "avocado-toast", name: "Тост с авокадо", mealSlot: "breakfast", amountG: 120, caloriesPer100: 190, proteinPer100: 5, fatPer100: 11, carbsPer100: 18 },
  { id: "banana", name: "Банан", mealSlot: "snack", amountG: 120, caloriesPer100: 96, proteinPer100: 1.5, fatPer100: 0.2, carbsPer100: 21 },
  { id: "apple", name: "Яблоко", mealSlot: "snack", amountG: 150, caloriesPer100: 47, proteinPer100: 0.4, fatPer100: 0.4, carbsPer100: 10 },
  { id: "protein-shake", name: "Протеиновый коктейль", mealSlot: "snack", amountG: 300, caloriesPer100: 105, proteinPer100: 20, fatPer100: 1.5, carbsPer100: 4 },
  { id: "rice-chicken", name: "Рис + курица", mealSlot: "lunch", amountG: 350, caloriesPer100: 165, proteinPer100: 12, fatPer100: 4, carbsPer100: 20 },
  { id: "buckwheat-chicken", name: "Гречка + курица", mealSlot: "lunch", amountG: 350, caloriesPer100: 150, proteinPer100: 13, fatPer100: 3, carbsPer100: 18 },
  { id: "potato-chicken", name: "Картофель + курица", mealSlot: "lunch", amountG: 350, caloriesPer100: 140, proteinPer100: 12, fatPer100: 3, carbsPer100: 16 },
  { id: "fish-rice", name: "Рыба + рис", mealSlot: "lunch", amountG: 350, caloriesPer100: 155, proteinPer100: 14, fatPer100: 3, carbsPer100: 18 },
  { id: "mac-cheese", name: "Макароны + сыр", mealSlot: "lunch", amountG: 300, caloriesPer100: 195, proteinPer100: 8, fatPer100: 9, carbsPer100: 20 },
  { id: "chicken-breast", name: "Куриная грудка", mealSlot: "lunch", amountG: 150, caloriesPer100: 165, proteinPer100: 31, fatPer100: 3.6, carbsPer100: 0 },
  { id: "salad", name: "Салат", mealSlot: "lunch", amountG: 200, caloriesPer100: 60, proteinPer100: 1.5, fatPer100: 4, carbsPer100: 5 },
  { id: "steak", name: "Стейк", mealSlot: "dinner", amountG: 200, caloriesPer100: 250, proteinPer100: 26, fatPer100: 16, carbsPer100: 0 },
];

export function quickTemplateById(id: string): QuickMealTemplate | undefined {
  return QUICK_MEAL_TEMPLATES.find((template) => template.id === id);
}

/** The macro fields a NutritionFood row needs, out of a preset. */
export function quickTemplateFoodDraft(
  template: QuickMealTemplate,
): Pick<NutritionFoodItem, "name" | "caloriesPer100" | "proteinPer100" | "fatPer100" | "carbsPer100"> {
  return {
    name: template.name,
    caloriesPer100: template.caloriesPer100,
    proteinPer100: template.proteinPer100,
    fatPer100: template.fatPer100,
    carbsPer100: template.carbsPer100,
  };
}
