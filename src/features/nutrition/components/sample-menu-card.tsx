"use client";

import { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { MEAL_SLOT_LABELS } from "@/features/nutrition/schemas";
import { formatCalories } from "@/features/nutrition/lib/format";
import { buildSampleMenu, SAMPLE_MENU_VARIANTS } from "@/features/nutrition/lib/menu";
import { quickTemplateById } from "@/features/nutrition/lib/quick-templates";
import type { QuickMealTemplate } from "@/features/nutrition/lib/quick-templates";
import type { NutritionAim } from "@/features/nutrition/lib/targets";

/**
 * Примерное меню на день — ответ на «а что мне есть-то».
 *
 * КАЖДАЯ СТРОКА КЛИКАБЕЛЬНА, И В ЭТОМ ВСЯ РАЗНИЦА. Меню, которое можно только
 * прочитать, — это картинка: человек соглашается с ней и всё равно идёт
 * заполнять дневник руками. Здесь каждая строка собрана из готового блюда, и
 * «+» записывает её в дневник ровно так же, как плитка во вкладке «Шаблоны», —
 * то есть путь от «согласен» до «записано» равен одному нажатию.
 *
 * ИТОГ ПОКАЗАН РЯДОМ С НОРМОЙ, А НЕ ВМЕСТО НЕЁ. Меню почти никогда не попадает в
 * норму до килокалории — порции ограничены разумными пределами (см. menu.ts), и
 * подгонять их означало бы предлагать 310 г стейка. Честнее показать оба числа:
 * человек сам видит, насколько раскладка близка, и не считает, что приложение
 * ошиблось в арифметике.
 */
export function SampleMenuCard({
  aim,
  calories,
  proteinG,
  onApply,
}: {
  aim: NutritionAim;
  /** Дневная норма калорий — та, что стоит в NutritionGoal. */
  calories: number;
  /** Дневная норма белка, для строки сверки под итогом. */
  proteinG: number;
  onApply: (template: QuickMealTemplate) => Promise<unknown>;
}) {
  const [variant, setVariant] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const menu = buildSampleMenu({ calories, proteinG }, aim, variant);

  async function apply(templateId: string) {
    const template = quickTemplateById(templateId);
    if (!template) return;

    setPendingId(templateId);
    haptics.tap();
    try {
      await onApply(template);
    } finally {
      setPendingId(null);
    }
  }

  const caloriesDelta = menu.totals.calories - calories;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-section text-muted-foreground">Примерное меню на день</p>
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setVariant((n) => (n + 1) % SAMPLE_MENU_VARIANTS);
          }}
          className="press-sm -m-1 inline-flex items-center gap-1 p-1 text-caption text-subtle-foreground active:text-foreground"
        >
          Другой вариант
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <Card>
        <div className="flex flex-col divide-y divide-border">
          {menu.items.map((item) => (
            <div key={item.slot} className="flex items-start gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-label uppercase text-subtle-foreground">
                  {MEAL_SLOT_LABELS[item.slot]}
                </p>
                <p className="mt-1 truncate text-body font-medium text-foreground">{item.name}</p>
                <p className="mt-0.5 line-clamp-1 text-micro text-subtle-foreground">
                  {item.ingredients.join(" · ")}
                </p>
                <p className="numeric mt-1 text-caption text-muted-foreground">
                  {item.amountG} г · {formatCalories(item.calories)} · Б {item.proteinG} Ж{" "}
                  {item.fatG} У {item.carbsG}
                </p>
              </div>

              <Button
                size="icon"
                variant="secondary"
                aria-label={`Записать: ${item.name}`}
                disabled={pendingId === item.templateId}
                onClick={() => void apply(item.templateId)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-fill-subtle p-3.5">
          <div className="min-w-0">
            <p className="text-label uppercase text-subtle-foreground">Итого за день</p>
            <p className="numeric mt-1 text-body font-medium text-foreground">
              {formatCalories(menu.totals.calories)} · Б {menu.totals.proteinG} Ж{" "}
              {menu.totals.fatG} У {menu.totals.carbsG}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-label uppercase text-subtle-foreground">Норма</p>
            <p
              className={cn(
                "numeric mt-1 text-body font-medium",
                Math.abs(caloriesDelta) <= 100 ? "text-positive" : "text-muted-foreground",
              )}
            >
              {formatCalories(calories)}
            </p>
          </div>
        </div>
      </Card>

      <p className="text-caption text-subtle-foreground">
        Раскладка нормы, а не диета. Порции округлены, поэтому итог отличается от нормы на{" "}
        {Math.abs(caloriesDelta)} ккал — записывайте то, что съели на самом деле.
      </p>
    </div>
  );
}
