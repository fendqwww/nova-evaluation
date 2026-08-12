"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from "@/features/nutrition/schemas";
import { formatCalories } from "@/features/nutrition/lib/format";
import {
  QUICK_MEAL_TEMPLATES,
  quickTemplateCalories,
  type QuickMealTemplate,
} from "@/features/nutrition/lib/quick-templates";
import type { MealSlot } from "@/features/nutrition/types";

/**
 * Popular dishes a brand-new diary starts with nothing like — Рис + курица,
 * Овсянка, Протеиновый коктейль and so on. One tap applies a preset exactly
 * the way TemplatesList applies a saved one; see applyQuickTemplate in
 * nutrition.repository.ts for what "applies" means the first time versus
 * every time after.
 *
 * РАЗБИТО ПО ПРИЁМАМ ПИЩИ, А НЕ ОДНИМ СПИСКОМ. Пока блюд было семнадцать, плоская
 * сетка читалась целиком и сортировать было нечего. Сорок с лишним плиток подряд
 * читаться перестают: человек, которому нужен ужин, пролистывает мимо каш и
 * орехов и находит его на четвёртом экране — то есть платит за расширение
 * каталога тем, что перестаёт им пользоваться. Заголовок приёма пищи стоит
 * ровно столько, сколько занимает строка, и превращает стену в четыре коротких
 * списка, каждый из которых открывается там, где человек и искал.
 *
 * Порядок групп — ход дня (MEAL_SLOTS), а не число блюд в каждой: список, где
 * ужин идёт перед завтраком, потому что ужинов больше, читается как выдача
 * поиска, а не как меню.
 */

function TemplateTile({
  template,
  isPending,
  onApply,
}: {
  template: QuickMealTemplate;
  isPending: boolean;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onApply}
      className="press-sm flex flex-col items-start gap-2 rounded-xl border border-border surface-raised px-3 py-3 text-left shadow-card edge-light active:border-border-strong disabled:opacity-60"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="truncate text-caption font-medium tracking-[-0.012em] text-foreground">
          {template.name}
        </span>
        <Zap className="h-3.5 w-3.5 shrink-0 text-accent" />
      </div>

      {/* Состав, а не только калории. Две цифры не отвечают на «что там внутри»,
          и без ответа блюдо нельзя ни сверить со своей тарелкой, ни повторить. */}
      <span className="line-clamp-1 text-micro text-subtle-foreground">
        {template.ingredients.join(" · ")}
      </span>

      <span className="numeric text-caption text-muted-foreground">
        {isPending ? "Добавляем…" : formatCalories(quickTemplateCalories(template))}
      </span>
    </button>
  );
}

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

  const bySlot = new Map<MealSlot, QuickMealTemplate[]>();
  for (const template of QUICK_MEAL_TEMPLATES) {
    const group = bySlot.get(template.mealSlot);
    if (group) group.push(template);
    else bySlot.set(template.mealSlot, [template]);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-caption text-muted-foreground">
        Готовые блюда — добавьте в дневник в один тап
      </p>

      {MEAL_SLOTS.map((slot) => {
        const group = bySlot.get(slot);
        if (!group || group.length === 0) return null;

        return (
          <div key={slot} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-section text-muted-foreground">{MEAL_SLOT_LABELS[slot]}</p>
              <span className="numeric text-caption text-subtle-foreground">{group.length}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {group.map((template) => (
                <TemplateTile
                  key={template.id}
                  template={template}
                  isPending={pendingId === template.id}
                  onApply={() => void apply(template)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
