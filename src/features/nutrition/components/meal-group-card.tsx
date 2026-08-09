"use client";

import { Coffee, Plus, Sandwich, Soup, UtensilsCrossed, Trash2 } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { IconChip } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { formatCalories, formatGrams } from "@/features/nutrition/lib/format";
import { entryMacros } from "@/features/nutrition/lib/stats";
import { MEAL_SLOT_LABELS } from "@/features/nutrition/schemas";
import type { MealSlot, NutritionEntryItem } from "@/features/nutrition/types";

const SLOT_ICON: Record<MealSlot, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Soup,
  dinner: UtensilsCrossed,
  snack: Sandwich,
};

function EntryRow({
  entry,
  onDelete,
}: {
  entry: NutritionEntryItem;
  onDelete: () => void;
}) {
  const macros = entryMacros(entry);

  return (
    <div className="group flex items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body text-foreground">{entry.food.name}</span>
        <span className="text-caption text-subtle-foreground">
          {formatGrams(entry.amountG)} · Б {Math.round(macros.proteinG)} Ж {Math.round(macros.fatG)} У{" "}
          {Math.round(macros.carbsG)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="numeric text-caption font-medium text-foreground">
          {formatCalories(macros.calories)}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Удалить ${entry.food.name}`}
          className="rounded-md p-1.5 text-subtle-foreground opacity-0 transition-opacity hover:bg-fill-muted hover:text-destructive group-hover:opacity-100 group-active:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** One meal slot: its entries, their combined calories, and a way to add more. */
export function MealGroupCard({
  slot,
  entries,
  onAddFood,
  onDeleteEntry,
}: {
  slot: MealSlot;
  entries: NutritionEntryItem[];
  onAddFood: () => void;
  onDeleteEntry: (entryId: string) => void;
}) {
  const Icon = SLOT_ICON[slot];
  const calories = entries.reduce((total, entry) => total + entryMacros(entry).calories, 0);

  return (
    <Card>
      <div className="flex flex-col p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <IconChip tone="score" size="sm">
              <Icon className="h-3.5 w-3.5" />
            </IconChip>
            <span className="text-body font-medium text-foreground">
              {MEAL_SLOT_LABELS[slot]}
            </span>
            {entries.length > 0 && (
              <span className="numeric text-caption text-subtle-foreground">
                {formatCalories(calories)}
              </span>
            )}
          </div>
          <Button size="icon" variant="ghost" aria-label={`Добавить в ${MEAL_SLOT_LABELS[slot].toLocaleLowerCase("ru")}`} onClick={onAddFood}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {entries.length > 0 && (
          <div className="mt-1 flex flex-col divide-y divide-border">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} onDelete={() => onDeleteEntry(entry.id)} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
