"use client";

import { SegmentedTabs } from "@/shared/ui/segmented-tabs";

export type NutritionTabId = "diary" | "plan" | "templates" | "foods" | "stats";

const TABS = [
  { id: "diary", label: "Дневник" },
  { id: "plan", label: "План" },
  { id: "templates", label: "Шаблоны" },
  { id: "foods", label: "Продукты" },
  { id: "stats", label: "Статистика" },
] as const satisfies ReadonlyArray<{ id: NutritionTabId; label: string }>;

/**
 * Five surfaces, one section — same control every other section uses, and for
 * the same reason: today's diary, the reusable templates, the personal
 * catalogue and the weekly trend are different questions, and stacking them on
 * one scroll would bury today's log under a shelf of products.
 *
 * «ПЛАН» СТОИТ ВТОРЫМ, СРАЗУ ЗА ДНЕВНИКОМ. Он отвечает на вопрос, который
 * возникает раньше всех остальных и до сих пор оставался без ответа: норму
 * приложение считало само, а что именно есть, чтобы в неё попасть, человек
 * придумывал сам. Дневник остаётся первым, потому что открывают раздел чаще
 * всего чтобы записать; план — второй, потому что к нему возвращаются, когда
 * записывать нечего.
 *
 * ПЯТЬ ПОДПИСЕЙ НЕ ПОМЕЩАЮТСЯ В РЯД НА УЗКОМ ТЕЛЕФОНЕ, И ЭТО НОРМАЛЬНО. Раньше
 * это было поломкой: полоска молча выезжала за край карточки, и «Статистика»
 * после «Продуктов» обрезалась. Теперь лента прокручивается — см.
 * SegmentedTabs.
 */
export function NutritionTabs({
  tab,
  onChange,
}: {
  tab: NutritionTabId;
  onChange: (tab: NutritionTabId) => void;
}) {
  return (
    <SegmentedTabs
      options={TABS}
      value={tab}
      onChange={onChange}
      layoutId="nutrition-tab-active"
      ariaLabel="Разделы питания"
    />
  );
}
