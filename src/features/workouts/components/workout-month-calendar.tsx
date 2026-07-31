"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  WEEKDAY_SHORT,
  addMonths,
  daysBetween,
  diffDays,
  endOfMonth,
  formatMonth,
  startOfMonth,
  weekdayIndex,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { isLoggable } from "@/features/workouts/lib/plan";
import type { WorkoutDayState } from "@/features/workouts/lib/stats";
import { dayCellClass } from "@/features/workouts/lib/tone";

/**
 * The month grid — the record of what was actually trained, and the only place
 * a day outside today can be corrected.
 *
 * One component serves both readings of "календарь выполненных тренировок": one
 * programme's own days, where every cell is tappable, and the whole section's
 * days, where a cell carries how many sessions happened and nothing is
 * editable. The difference is entirely in the props — a second near-identical
 * grid would be a second place for the Monday-first padding to go wrong.
 *
 * Navigation is bounded by the loaded window at one end and the current month
 * at the other: paging into a month whose history was never fetched would
 * render every day as a miss, which is a lie the UI must not be able to tell.
 */
export function WorkoutMonthCalendar({
  today,
  windowStart,
  stateOf,
  countOf,
  onToggleDay,
  disabled = false,
}: {
  today: CalendarDay;
  windowStart: CalendarDay;
  stateOf: (day: CalendarDay) => WorkoutDayState;
  /** Sessions finished that day, when the grid covers more than one workout. */
  countOf?: (day: CalendarDay) => number;
  onToggleDay?: (day: CalendarDay, isDone: boolean) => void;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState<CalendarDay>(startOfMonth(today));

  const first = startOfMonth(anchor);
  const days = daysBetween(first, endOfMonth(anchor));
  // Monday-first grid: pad the leading gap so the 1st lands under its weekday.
  const leadingBlanks = weekdayIndex(first);

  const canGoBack = diffDays(windowStart, addMonths(first, -1)) >= 0;
  const canGoForward = diffDays(addMonths(first, 1), today) >= 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => setAnchor(addMonths(anchor, -1))}
          aria-label="Предыдущий месяц"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 active:bg-white/6 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-caption font-semibold text-foreground">{formatMonth(anchor)}</span>

        <button
          type="button"
          disabled={!canGoForward}
          onClick={() => setAnchor(addMonths(anchor, 1))}
          aria-label="Следующий месяц"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 active:bg-white/6 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_SHORT.map((label) => (
          <span
            key={label}
            className="pb-0.5 text-center text-[0.625rem] font-medium text-subtle-foreground"
          >
            {label}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}

        {days.map((day) => {
          const state = stateOf(day);
          const isDone = state === "done";
          const count = countOf?.(day) ?? 0;
          const isToday = day === today;
          const label = day.slice(-2).replace(/^0/, "");

          const canToggle =
            onToggleDay !== undefined &&
            !disabled &&
            isLoggable(day, today) &&
            diffDays(windowStart, day) >= 0 &&
            state !== "before";

          const cell = (
            <span
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-lg text-[0.75rem] transition-colors duration-200",
                dayCellClass(state),
                isToday && !isDone && "ring-1 ring-inset ring-accent-border",
              )}
            >
              {isDone ? (
                countOf && count > 1 ? (
                  <span className="numeric font-semibold">{count}</span>
                ) : (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                )
              ) : (
                label
              )}
            </span>
          );

          if (!canToggle) {
            return (
              <span key={day} className="block">
                {cell}
              </span>
            );
          }

          return (
            <motion.button
              key={day}
              type="button"
              whileTap={{ scale: 0.86 }}
              onClick={() => onToggleDay(day, !isDone)}
              role="checkbox"
              aria-checked={isDone}
              aria-label={`${label} ${formatMonth(anchor)}`}
              className="block rounded-lg"
            >
              {cell}
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
        <Legend className="bg-positive" label="выполнено" />
        <Legend
          className="border border-destructive/35 bg-destructive-muted"
          label="пропущено"
        />
        <Legend className="border border-white/6" label="не по плану" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-[0.25rem]", className)} aria-hidden />
      <span className="text-[0.6875rem] text-subtle-foreground">{label}</span>
    </span>
  );
}
