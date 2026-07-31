"use client";

import { cn } from "@/shared/lib/cn";
import { WEEKDAY_SHORT } from "@/shared/lib/calendar-day";
import { NO_PLAN_MASK } from "@/features/workouts/schemas";
import {
  PLAN_PRESETS,
  describePlan,
  hasPlan,
  hasWeekday,
  toggleWeekday,
} from "@/features/workouts/lib/plan";

/**
 * Which days the programme is owed on — or none.
 *
 * "Без плана" is a first-class option, not the absence of a choice. Training
 * when you can is a real way to train, and the difference matters downstream:
 * a workout with no plan is never counted as missed, and its adherence figure
 * is suppressed rather than shown as 0%.
 */
export function WorkoutPlanPicker({
  weekdayMask,
  onChange,
}: {
  weekdayMask: number;
  onChange: (mask: number) => void;
}) {
  const planned = hasPlan(weekdayMask);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-1">
        {WEEKDAY_SHORT.map((label, index) => {
          const selected = hasWeekday(weekdayMask, index);

          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(toggleWeekday(weekdayMask, index))}
              aria-pressed={selected}
              aria-label={label}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-lg border text-caption font-medium transition-colors duration-200",
                selected
                  ? "border-accent-border bg-accent-muted text-accent"
                  : "border-border text-subtle-foreground active:border-border-strong",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PLAN_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.mask)}
            className={cn(
              "rounded-md border px-2 py-1 text-[0.6875rem] font-medium transition-colors duration-200",
              preset.mask === weekdayMask
                ? "border-accent-border text-accent"
                : "border-border text-subtle-foreground active:border-border-strong",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="text-caption text-subtle-foreground">
        {planned
          ? `${describePlan(weekdayMask)} — в эти дни тренировка попадёт в «На сегодня» и в индекс.`
          : "Без плана — тренировка не будет считаться пропущенной ни в один день."}
      </p>

      {planned && (
        <button
          type="button"
          onClick={() => onChange(NO_PLAN_MASK)}
          className="self-start text-[0.6875rem] font-medium text-subtle-foreground underline-offset-2 transition-colors duration-200 active:text-foreground"
        >
          Убрать план
        </button>
      )}
    </div>
  );
}
