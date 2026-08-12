"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { formatCalories } from "@/features/nutrition/lib/format";
import { AMOUNT_G_MAX, MEAL_SLOT_LABELS, MEAL_SLOTS } from "@/features/nutrition/schemas";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { MealSlot, NutritionFoodItem } from "@/features/nutrition/types";

/** How much a food contributes at the amount currently entered. */
function scaledMacros(food: NutritionFoodItem, amountG: number) {
  const scale = amountG / 100;
  return {
    calories: food.caloriesPer100 * scale,
    proteinG: food.proteinPer100 * scale,
    fatG: food.fatPer100 * scale,
    carbsG: food.carbsPer100 * scale,
  };
}

/** Amount + meal slot for a food already chosen from the picker. */
export function LogEntryModal({
  food,
  defaultSlot,
  day,
  open,
  onOpenChange,
  onLog,
  onToggleFavorite,
}: {
  food: NutritionFoodItem | null;
  defaultSlot: MealSlot;
  day: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLog: (draft: { foodId: string; mealSlot: MealSlot; day: CalendarDay; amountG: number }) => Promise<unknown>;
  onToggleFavorite: (foodId: string, isFavorite: boolean) => void;
}) {
  const [amount, setAmount] = useState("100");
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultSlot);
  const [isPending, setPending] = useState(false);
  const [hasError, setError] = useState(false);

  if (!food) return null;

  const amountG = Number(amount) || 0;
  const isValid = amountG >= 1 && amountG <= AMOUNT_G_MAX;
  const macros = scaledMacros(food, amountG);

  async function save() {
    setPending(true);
    setError(false);
    try {
      await onLog({ foodId: food!.id, mealSlot, day, amountG });
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center justify-between gap-2">
            <ModalTitle className="min-w-0 flex-1 truncate">{food.name}</ModalTitle>
            <button
              type="button"
              onClick={() => onToggleFavorite(food.id, !food.isFavorite)}
              aria-label={food.isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
              className="shrink-0 rounded-md p-1.5 text-subtle-foreground transition-colors hover:bg-fill-muted"
            >
              <Star className={cn("h-4 w-4", food.isFavorite && "fill-current text-tint-orange")} />
            </button>
          </div>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-caption text-muted-foreground">Количество, г</span>
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="100"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Приём пищи</span>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setMealSlot(slot)}
                  aria-pressed={mealSlot === slot}
                  className={cn(
                    "rounded-lg border px-1.5 py-2 text-micro font-medium transition-colors duration-200",
                    mealSlot === slot
                      ? "border-accent-border bg-accent-muted text-accent"
                      : "border-border text-subtle-foreground active:border-border-strong",
                  )}
                >
                  {MEAL_SLOT_LABELS[slot]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-fill-subtle px-4 py-3">
            <span className="text-caption text-muted-foreground">
              Б {Math.round(macros.proteinG)} · Ж {Math.round(macros.fatG)} · У{" "}
              {Math.round(macros.carbsG)}
            </span>
            <span className="numeric text-body font-semibold text-foreground">
              {formatCalories(macros.calories)}
            </span>
          </div>

          {hasError && (
            <p className="text-caption text-destructive">Не удалось сохранить. Попробуй ещё раз.</p>
          )}

          <Button className="w-full" size="lg" disabled={!isValid || isPending} onClick={() => void save()}>
            {isPending ? "Добавляем…" : "Добавить"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
