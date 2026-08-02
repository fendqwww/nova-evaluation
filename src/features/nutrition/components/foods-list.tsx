"use client";

import { useMemo, useState } from "react";
import { Apple, Plus, Star } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/cn";
import {
  FOOD_FILTERS,
  matchesFoodFilter,
  matchesFoodSearch,
  sortFoods,
  type FoodFilterId,
} from "@/features/nutrition/lib/collection";
import { formatCalories } from "@/features/nutrition/lib/format";
import type { NutritionFoodItem } from "@/features/nutrition/types";

/** The user's own catalogue — create, favourite, edit, retire. */
export function FoodsList({
  foods,
  onCreate,
  onEdit,
  onToggleFavorite,
}: {
  foods: NutritionFoodItem[];
  onCreate: () => void;
  onEdit: (food: NutritionFoodItem) => void;
  onToggleFavorite: (foodId: string, isFavorite: boolean) => void;
}) {
  const [filter, setFilter] = useState<FoodFilterId>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () =>
      sortFoods(
        foods.filter((food) => matchesFoodFilter(food, filter) && matchesFoodSearch(food, query)),
      ),
    [foods, filter, query],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти продукт..."
          className="flex-1"
        />
        <Button size="icon" aria-label="Новый продукт" onClick={onCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1.5">
        {FOOD_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-caption font-medium transition-colors duration-200",
              filter === option.id
                ? "border-accent-border bg-accent-muted text-accent"
                : "border-border text-subtle-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={<Apple className="h-5 w-5" />}
          title="Здесь пока пусто"
          description="Добавьте продукт вручную или создайте его прямо из дневника при первом добавлении."
          action={
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Новый продукт
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {visible.map((food) => (
            <div key={food.id} className="flex items-center justify-between gap-2 px-3.5 py-3">
              <button
                type="button"
                onClick={() => onEdit(food)}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
              >
                <span
                  className={cn(
                    "w-full truncate text-body text-foreground",
                    food.archivedAt && "text-subtle-foreground",
                  )}
                >
                  {food.name}
                  {food.archivedAt && " (архив)"}
                </span>
                <span className="text-caption text-subtle-foreground">
                  {formatCalories(food.caloriesPer100)} / 100 г · Б {food.proteinPer100} Ж{" "}
                  {food.fatPer100} У {food.carbsPer100}
                </span>
              </button>
              {!food.archivedAt && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(food.id, !food.isFavorite)}
                  aria-label={food.isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                  className="rounded-md p-1.5 text-subtle-foreground transition-colors hover:bg-white/[0.06]"
                >
                  <Star className={cn("h-4 w-4", food.isFavorite && "fill-current text-tint-orange")} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
