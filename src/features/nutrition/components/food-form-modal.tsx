"use client";

import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { foodDraftSchema } from "@/features/nutrition/schemas";
import type { NutritionFoodItem } from "@/features/nutrition/types";

/**
 * One modal for both creating and editing a catalogue food — the fields are
 * identical, and `food` being null is what makes it a create. Mirrors
 * WorkoutFormModal's shape: state seeded straight from props, remounted per
 * opening via a bumped key from the parent.
 */
export function FoodFormModal({
  food,
  initialName,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  food: NutritionFoodItem | null;
  initialName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: {
    name: string;
    caloriesPer100: number;
    proteinPer100: number;
    fatPer100: number;
    carbsPer100: number;
  }) => Promise<unknown>;
  onUpdate: (
    foodId: string,
    draft: {
      name: string;
      caloriesPer100: number;
      proteinPer100: number;
      fatPer100: number;
      carbsPer100: number;
    },
  ) => Promise<unknown>;
}) {
  const [name, setName] = useState(food?.name ?? initialName ?? "");
  const [calories, setCalories] = useState(food ? String(food.caloriesPer100) : "");
  const [protein, setProtein] = useState(food ? String(food.proteinPer100) : "");
  const [fat, setFat] = useState(food ? String(food.fatPer100) : "");
  const [carbs, setCarbs] = useState(food ? String(food.carbsPer100) : "");
  const [isPending, setPending] = useState(false);
  const [hasError, setError] = useState(false);

  const draft = {
    name,
    caloriesPer100: Number(calories) || 0,
    proteinPer100: Number(protein) || 0,
    fatPer100: Number(fat) || 0,
    carbsPer100: Number(carbs) || 0,
  };
  const isValid = foodDraftSchema.safeParse(draft).success;

  async function save() {
    setPending(true);
    setError(false);
    try {
      if (food) await onUpdate(food.id, draft);
      else await onCreate(draft);
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{food ? "Изменить продукт" : "Новый продукт"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: куриная грудка"
            aria-label="Название продукта"
          />

          <p className="text-caption text-muted-foreground">
            Пищевая ценность на 100 г (или 100 мл для напитков)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Калории</span>
              <Input
                type="number"
                inputMode="decimal"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Белки, г</span>
              <Input
                type="number"
                inputMode="decimal"
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Жиры, г</span>
              <Input
                type="number"
                inputMode="decimal"
                value={fat}
                onChange={(event) => setFat(event.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Углеводы, г</span>
              <Input
                type="number"
                inputMode="decimal"
                value={carbs}
                onChange={(event) => setCarbs(event.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          {hasError && (
            <p className="text-caption text-destructive">Не удалось сохранить. Попробуйте ещё раз.</p>
          )}

          <Button className="w-full" size="lg" disabled={!isValid || isPending} onClick={() => void save()}>
            {isPending ? "Сохраняем..." : food ? "Сохранить" : "Добавить в каталог"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
