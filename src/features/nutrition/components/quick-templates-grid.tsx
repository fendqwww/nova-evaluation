"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { MEAL_SLOT_LABELS } from "@/features/nutrition/schemas";
import { formatCalories } from "@/features/nutrition/lib/format";
import { QUICK_MEAL_TEMPLATES, type QuickMealTemplate } from "@/features/nutrition/lib/quick-templates";

/**
 * Popular dishes a brand-new diary starts with nothing like — Рис + курица,
 * Овсянка, Протеиновый коктейль and so on. One tap applies a preset exactly
 * the way TemplatesList applies a saved one; see applyQuickTemplate in
 * nutrition.repository.ts for what "applies" means the first time versus
 * every time after.
 */
export function QuickTemplatesGrid({
  onApply,
}: {
  onApply: (template: QuickMealTemplate) => Promise<unknown>;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function apply(template: QuickMealTemplate) {
    setPendingId(template.id);
    try {
      await onApply(template);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-caption text-muted-foreground">
        Готовые блюда — добавьте в дневник в один тап
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_MEAL_TEMPLATES.map((template) => {
          const calories = Math.round((template.caloriesPer100 * template.amountG) / 100);
          const isPending = pendingId === template.id;

          return (
            <button
              key={template.id}
              type="button"
              disabled={isPending}
              onClick={() => void apply(template)}
              className="press-sm flex flex-col items-start gap-2 rounded-xl border border-border surface-raised px-3 py-3 text-left shadow-card edge-light active:border-border-strong disabled:opacity-60"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="truncate text-[0.8125rem] font-medium tracking-[-0.012em] text-foreground">
                  {template.name}
                </span>
                <Zap className="h-3.5 w-3.5 shrink-0 text-accent" />
              </div>
              <span className="numeric text-caption text-subtle-foreground">
                {isPending ? "Добавляем..." : `${formatCalories(calories)} · ${MEAL_SLOT_LABELS[template.mealSlot]}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
