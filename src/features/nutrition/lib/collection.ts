import type { NutritionFoodItem } from "@/features/nutrition/types";

/**
 * Filtering, search and sort over the food catalogue — the same split
 * Workouts and Habits keep out of the view, so the picker and the "Мои
 * продукты" list read the same rules.
 */

export type FoodFilterId = "all" | "favorites" | "archived";

export const FOOD_FILTERS: { id: FoodFilterId; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "favorites", label: "Избранное" },
  { id: "archived", label: "Архив" },
];

export function matchesFoodFilter(food: NutritionFoodItem, filter: FoodFilterId): boolean {
  const isArchived = food.archivedAt !== null;

  // Archive is a separate room, the same convention Workouts' filter uses: an
  // archived food never shows up in the picker, since it can no longer be
  // logged — it only still renders on the entries that already used it.
  if (filter === "archived") return isArchived;
  if (isArchived) return false;

  switch (filter) {
    case "all":
      return true;
    case "favorites":
      return food.isFavorite;
  }
}

export function matchesFoodSearch(food: NutritionFoodItem, query: string): boolean {
  const trimmed = query.trim().toLocaleLowerCase("ru");
  if (!trimmed) return true;
  return food.name.toLocaleLowerCase("ru").includes(trimmed);
}

/** Favourites first, then alphabetical — matches listFoods' server-side order. */
export function sortFoods(foods: NutritionFoodItem[]): NutritionFoodItem[] {
  return [...foods].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return a.name.localeCompare(b.name, "ru");
  });
}
