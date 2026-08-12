"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export type NutritionTabId = "diary" | "plan" | "templates" | "foods" | "stats";

const TABS: { id: NutritionTabId; label: string }[] = [
  { id: "diary", label: "Дневник" },
  { id: "plan", label: "План" },
  { id: "templates", label: "Шаблоны" },
  { id: "foods", label: "Продукты" },
  { id: "stats", label: "Статистика" },
];

/**
 * Five surfaces, one section — same sliding-pill control as WorkoutsTabs, and
 * for the same reason: today's diary, the reusable templates, the personal
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
 * Пять вкладок — предел для этой полоски: подписи и так короткие, шестая
 * потребовала бы сокращений или прокрутки, и с этого момента вкладка перестаёт
 * быть видимой сразу.
 */
export function NutritionTabs({
  tab,
  onChange,
}: {
  tab: NutritionTabId;
  onChange: (tab: NutritionTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Разделы питания"
      className="glass-card flex gap-1 rounded-xl border p-1"
    >
      {TABS.map((option) => {
        const isActive = option.id === tab;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative flex-1 rounded-lg px-2 py-2 text-caption font-medium transition-colors duration-200",
              isActive ? "text-accent-foreground" : "text-muted-foreground active:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="nutrition-tab-active"
                className="absolute inset-0 -z-10 rounded-lg bg-accent shadow-[0_4px_14px_-6px_var(--accent)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
