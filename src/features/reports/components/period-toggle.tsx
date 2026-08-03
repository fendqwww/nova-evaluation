"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export type ReportsPeriod = "week" | "month";

const OPTIONS: { id: ReportsPeriod; label: string }[] = [
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
];

/** Same sliding-pill control as WorkoutsTabs/SleepTabs — here it switches the
 *  window every chart on the screen reads, not a section of the screen. */
export function PeriodToggle({
  period,
  onChange,
}: {
  period: ReportsPeriod;
  onChange: (period: ReportsPeriod) => void;
}) {
  return (
    <div role="tablist" aria-label="Период отчёта" className="glass-card flex gap-1 rounded-xl border p-1">
      {OPTIONS.map((option) => {
        const isActive = option.id === period;

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
                layoutId="reports-period-active"
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
