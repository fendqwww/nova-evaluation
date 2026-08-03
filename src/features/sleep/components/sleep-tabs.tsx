"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export type SleepTabId = "today" | "history" | "stats";

const TABS: { id: SleepTabId; label: string }[] = [
  { id: "today", label: "Сегодня" },
  { id: "history", label: "История" },
  { id: "stats", label: "Статистика" },
];

/** Same sliding-pill control as WorkoutsTabs/NutritionTabs, for the same
 *  reason: the section answers three different questions on one screen. */
export function SleepTabs({ tab, onChange }: { tab: SleepTabId; onChange: (tab: SleepTabId) => void }) {
  return (
    <div role="tablist" aria-label="Разделы сна" className="glass-card flex gap-1 rounded-xl border p-1">
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
                layoutId="sleep-tab-active"
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
