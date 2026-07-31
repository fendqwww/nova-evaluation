"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export type WorkoutsTabId = "plan" | "history" | "stats";

const TABS: { id: WorkoutsTabId; label: string }[] = [
  { id: "plan", label: "Программы" },
  { id: "history", label: "История" },
  { id: "stats", label: "Статистика" },
];

/**
 * Three surfaces, one section.
 *
 * Goals, Habits and Tasks are each a single list, so they need no such control.
 * Training genuinely is not: the programme you follow, the log of what you did,
 * and what that log adds up to are three different questions, and stacking all
 * three on one scroll would bury the first one — the only one that is
 * actionable right now — under a month of history.
 *
 * The sliding pill uses the same shared-layoutId trick the bottom navigation
 * does, so the indicator physically moves between tabs instead of cross-fading.
 */
export function WorkoutsTabs({
  tab,
  onChange,
}: {
  tab: WorkoutsTabId;
  onChange: (tab: WorkoutsTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Разделы тренировок"
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
                layoutId="workouts-tab-active"
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
