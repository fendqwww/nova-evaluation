"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { sortFoods, matchesFoodSearch } from "@/features/nutrition/lib/collection";
import { formatCalories } from "@/features/nutrition/lib/format";
import type { NutritionFoodItem } from "@/features/nutrition/types";

/**
 * Search-and-select over the user's own catalogue, with a way to jump straight
 * to "create a new food" when nothing matches — the same escape hatch a
 * combobox with a fixed list needs, since there is no shared catalogue to fall
 * back to (see the note on NutritionFood in schema.prisma).
 */
export function FoodPickerModal({
  foods,
  open,
  onOpenChange,
  onSelect,
  onCreateNew,
}: {
  foods: NutritionFoodItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (food: NutritionFoodItem) => void;
  onCreateNew: (name: string) => void;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const active = foods.filter((food) => food.archivedAt === null);
    return sortFoods(active.filter((food) => matchesFoodSearch(food, query)));
  }, [foods, query]);

  const trimmed = query.trim();

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Выбрать продукт</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск продукта"
              className="pl-10"
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<Search className="h-5 w-5" />}
              title={trimmed ? "Ничего не найдено" : "В каталоге пока пусто"}
              description={
                trimmed
                  ? "Создай новый продукт с таким названием."
                  : "Добавь первый продукт — дальше он всегда под рукой."
              }
              action={
                <Button onClick={() => onCreateNew(trimmed)}>
                  <Plus className="h-4 w-4" />
                  Создать «{trimmed || "продукт"}»
                </Button>
              }
            />
          ) : (
            <div className="flex max-h-[50vh] flex-col divide-y divide-border overflow-y-auto">
              {visible.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => onSelect(food)}
                  className="flex items-center justify-between gap-2 py-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {food.isFavorite && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-current text-tint-orange" />
                    )}
                    <span className="truncate text-body text-foreground">{food.name}</span>
                  </div>
                  <span className="numeric shrink-0 text-caption text-subtle-foreground">
                    {formatCalories(food.caloriesPer100)} / 100 г
                  </span>
                </button>
              ))}
            </div>
          )}

          {visible.length > 0 && (
            <Button variant="secondary" className={cn("w-full")} onClick={() => onCreateNew(trimmed)}>
              <Plus className="h-4 w-4" />
              Новый продукт
            </Button>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
