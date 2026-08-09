"use client";

import { Layers, Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { IconChip } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { MEAL_SLOT_LABELS } from "@/features/nutrition/schemas";
import { formatCalories } from "@/features/nutrition/lib/format";
import type { NutritionMealTemplate } from "@/features/nutrition/types";

function templateCalories(template: NutritionMealTemplate): number {
  return template.items.reduce((total, item) => {
    if (!item.food) return total;
    return total + (item.food.caloriesPer100 * item.amountG) / 100;
  }, 0);
}

/** The user's own saved meals — see QuickTemplatesGrid for the curated
 *  presets shown above this list. Applied to today (or the open day) in one tap. */
export function TemplatesList({
  templates,
  onCreate,
  onApply,
  onDelete,
}: {
  templates: NutritionMealTemplate[];
  onCreate: () => void;
  onApply: (template: NutritionMealTemplate) => void;
  onDelete: (templateId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground">Мои шаблоны</p>
        <Button size="icon" aria-label="Новый шаблон" onClick={onCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={<Layers className="h-5 w-5" />}
          title="Шаблонов пока нет"
          description="Собери повторяющийся приём пищи один раз — дальше он записывается в одно касание."
          action={
            <Button size="lg" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Создать шаблон
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {templates.map((template) => (
            <Card key={template.id}>
              <div className="flex items-center gap-3 p-3.5">
                <IconChip tone="score" size="md">
                  <Layers className="h-4 w-4" />
                </IconChip>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-medium text-foreground">
                    {template.name}
                  </span>
                  <span className="text-caption text-subtle-foreground">
                    {MEAL_SLOT_LABELS[template.mealSlot]} · {template.items.length}{" "}
                    продукт(ов) · {formatCalories(templateCalories(template))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(template.id)}
                  aria-label={`Удалить шаблон ${template.name}`}
                  className="rounded-md p-1.5 text-subtle-foreground transition-colors hover:bg-fill-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Button size="sm" onClick={() => onApply(template)}>
                  <Zap className="h-3.5 w-3.5" />
                  Добавить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
