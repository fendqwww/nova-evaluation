"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  WEEKDAY_SHORT,
  addDays,
  daysBetween,
  startOfWeek,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { isTickable } from "@/features/habits/lib/schedule";
import { dayState } from "@/features/habits/lib/stats";
import { dayCellClass } from "@/features/habits/lib/tone";
import type { HabitItem } from "@/features/habits/types";

/**
 * The current week as seven taps.
 *
 * This is the section's primary control, not a summary: forgetting to log
 * yesterday is the single most common thing that happens to a habit tracker,
 * and making the fix a tap on the visible week is what stops the history from
 * quietly rotting. Future days are rendered but inert — they are context for
 * where the week is going, not something that can be pre-claimed.
 */
export function HabitWeekStrip({
  habit,
  today,
  onToggle,
  disabled = false,
}: {
  habit: HabitItem;
  today: CalendarDay;
  onToggle: (day: CalendarDay, isDone: boolean) => void;
  disabled?: boolean;
}) {
  const weekStart = startOfWeek(today);
  const days = daysBetween(weekStart, addDays(weekStart, 6));

  return (
    <div className="flex items-stretch justify-between gap-1">
      {days.map((day, index) => {
        const state = dayState(habit, day, today);
        const isKept = state === "kept";
        const canTick = !disabled && isTickable(day, today);
        const isToday = day === today;

        const content = (
          <>
            <span
              className={cn(
                "text-[0.625rem] font-medium leading-none",
                isToday ? "text-foreground" : "text-subtle-foreground",
              )}
            >
              {WEEKDAY_SHORT[index]}
            </span>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg text-[0.6875rem] transition-colors duration-200",
                dayCellClass(state),
                isToday && !isKept && "ring-1 ring-inset ring-accent-border",
              )}
            >
              {isKept ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                day.slice(-2).replace(/^0/, "")
              )}
            </span>
          </>
        );

        if (!canTick) {
          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-1.5 opacity-60">
              {content}
            </div>
          );
        }

        return (
          <motion.button
            key={day}
            type="button"
            whileTap={{ scale: 0.86 }}
            onClick={() => onToggle(day, !isKept)}
            role="checkbox"
            aria-checked={isKept}
            aria-label={`${WEEKDAY_SHORT[index]}, ${day}`}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-lg"
          >
            {content}
          </motion.button>
        );
      })}
    </div>
  );
}
