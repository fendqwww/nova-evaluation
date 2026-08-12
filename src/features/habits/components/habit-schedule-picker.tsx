"use client";

import { cn } from "@/shared/lib/cn";
import { WEEKDAY_SHORT } from "@/shared/lib/calendar-day";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import {
  SCHEDULE_PRESETS,
  countWeekdays,
  hasWeekday,
  toggleWeekday,
} from "@/features/habits/lib/schedule";
import type { HabitSchedule, HabitScheduleKind } from "@/features/habits/types";

const KIND_OPTIONS: { id: HabitScheduleKind; label: string }[] = [
  { id: "daily", label: "Ежедневно" },
  { id: "weekdays", label: "По дням" },
  { id: "weekly", label: "Раз в неделю" },
];

/**
 * Picking a schedule without picking an invalid one.
 *
 * The control holds the whole HabitSchedule union rather than three loose
 * fields, so switching mode swaps the shape instead of leaving stale values
 * behind, and the empty weekday mask the zod schema rejects is unreachable —
 * the last selected day cannot be turned off.
 */
export function HabitSchedulePicker({
  schedule,
  onChange,
}: {
  schedule: HabitSchedule;
  onChange: (schedule: HabitSchedule) => void;
}) {
  function selectKind(kind: HabitScheduleKind) {
    if (kind === schedule.kind) return;
    switch (kind) {
      case "daily":
        return onChange({ kind: "daily" });
      case "weekdays":
        // Seeded Mon–Fri rather than empty: an empty mask is the one invalid
        // state, and opening on it would show an error the user did not cause.
        return onChange({ kind: "weekdays", weekdayMask: 0b0011111 });
      case "weekly":
        return onChange({ kind: "weekly", timesPerWeek: 3 });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {KIND_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => selectKind(option.id)}
            aria-pressed={option.id === schedule.kind}
            className={cn(
              "flex-1 rounded-lg border px-2 py-2 text-caption font-medium transition-colors duration-200",
              option.id === schedule.kind
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground active:border-border-strong",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {schedule.kind === "weekdays" && (
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-1">
            {WEEKDAY_SHORT.map((label, index) => {
              const selected = hasWeekday(schedule.weekdayMask, index);
              // The last remaining day stays locked on: a habit due on no days
              // is not a schedule the app can act on.
              const isLast = selected && countWeekdays(schedule.weekdayMask) === 1;

              return (
                <button
                  key={label}
                  type="button"
                  disabled={isLast}
                  onClick={() =>
                    onChange({
                      kind: "weekdays",
                      weekdayMask: toggleWeekday(schedule.weekdayMask, index),
                    })
                  }
                  aria-pressed={selected}
                  aria-label={label}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center rounded-lg border text-caption font-medium transition-colors duration-200 disabled:opacity-70",
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

          <div className="flex gap-1.5">
            {SCHEDULE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ kind: "weekdays", weekdayMask: preset.mask })}
                className={cn(
                  "rounded-md border px-2 py-1 text-micro font-medium transition-colors duration-200",
                  preset.mask === schedule.weekdayMask
                    ? "border-accent-border text-accent"
                    : "border-border text-subtle-foreground active:border-border-strong",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {schedule.kind === "weekly" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((times) => (
              <button
                key={times}
                type="button"
                onClick={() => onChange({ kind: "weekly", timesPerWeek: times })}
                aria-pressed={times === schedule.timesPerWeek}
                className={cn(
                  "numeric flex h-10 flex-1 items-center justify-center rounded-lg border text-caption font-semibold transition-colors duration-200",
                  times === schedule.timesPerWeek
                    ? "border-accent-border bg-accent-muted text-accent"
                    : "border-border text-subtle-foreground active:border-border-strong",
                )}
              >
                {times}
              </button>
            ))}
          </div>
          <p className="text-caption text-subtle-foreground">
            {schedule.timesPerWeek}{" "}
            {pluralizeRu(schedule.timesPerWeek, ["раз", "раза", "раз"])} в неделю — дни
            выбираете сами, серия считается по неделям.
          </p>
        </div>
      )}
    </div>
  );
}
