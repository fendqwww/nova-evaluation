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
import { isTickable } from "@/features/habits/lib/schedule";
import { dayState } from "@/features/habits/lib/stats";
import { dayCellClass } from "@/features/habits/lib/tone";
import type { HabitItem } from "@/features/habits/types";

/**
 * The month grid — the habit's actual record, and the only place a day outside
 * the current week can be corrected.
 *
 * Navigation is bounded by the loaded log window at one end and the current
 * month at the other: paging into a month whose history was never fetched would
 * render every day as a miss, which is a lie the UI must not be able to tell.
 */
export function HabitMonthCalendar({
  habit,
  today,
  windowStart,
  onToggleDay,
  disabled = false,
}: {
  habit: HabitItem;
  today: CalendarDay;
  windowStart: CalendarDay;
  onToggleDay: (day: CalendarDay, isDone: boolean) => void;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState<CalendarDay>(startOfMonth(today));

  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);
  const days = daysBetween(first, last);
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
          className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 active:bg-fill-muted disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-caption font-semibold text-foreground">
          {formatMonth(anchor)}
        </span>

        <button
          type="button"
          disabled={!canGoForward}
          onClick={() => setAnchor(addMonths(anchor, 1))}
          aria-label="Следующий месяц"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 active:bg-fill-muted disabled:pointer-events-none disabled:opacity-30"
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
          const state = dayState(habit, day, today);
          const isKept = state === "kept";
          const canTick = !disabled && isTickable(day, today) && diffDays(windowStart, day) >= 0;
          const isToday = day === today;
          const label = day.slice(-2).replace(/^0/, "");

          const cell = (
            <span
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-lg text-[0.75rem] transition-colors duration-200",
                dayCellClass(state),
                isToday && !isKept && "ring-1 ring-inset ring-accent-border",
              )}
            >
              {isKept ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : label}
            </span>
          );

          if (!canTick) {
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
              onClick={() => onToggleDay(day, !isKept)}
              role="checkbox"
              aria-checked={isKept}
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
        <Legend className="border border-destructive/35 bg-destructive-muted" label="пропущено" />
        <Legend className="border border-border" label="не по плану" />
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
