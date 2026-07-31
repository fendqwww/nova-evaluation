"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export type NutritionTabId = "diary" | "templates" | "foods" | "stats";

const TABS: { id: NutritionTabId; label: string }[] = [
  { id: "diary", label: "Дневник" },
  { id: "templates", label: "Шаблоны" },
  { id: "foods", label: "Продукты" },
  { id: "stats", label: "Статистика" },
];

/**
 * Four surfaces, one section — same sliding-pill control as WorkoutsTabs, and
 * for the same reason: today's diary, the reusable templates, the personal
 * catalogue and the weekly trend are different questions, and stacking them on
 * one scroll would bury today's log under a shelf of products.
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
      className="flex gap-1 rounded-xl border border-border bg-black/20 p-1"
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
                className="absolute inset-0 -z-10 rounded-lg bg-accent"
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
