"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export type AppearanceTabId = "today" | "routines" | "photos" | "progress";

const TABS: { id: AppearanceTabId; label: string }[] = [
  { id: "today", label: "Сегодня" },
  { id: "routines", label: "Уход" },
  { id: "photos", label: "Фото" },
  { id: "progress", label: "Прогресс" },
];

/**
 * Four surfaces, one section — same sliding-pill control as NutritionTabs and
 * WorkoutsTabs, and for the same reason: today's checklist, the library of
 * procedures, the photo history and the longer-term picture are different
 * questions, and stacking them on one scroll would bury tonight's routine
 * under a year of photos.
 */
export function AppearanceTabs({
  tab,
  onChange,
}: {
  tab: AppearanceTabId;
  onChange: (tab: AppearanceTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Разделы внешности"
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
                layoutId="appearance-tab-active"
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
