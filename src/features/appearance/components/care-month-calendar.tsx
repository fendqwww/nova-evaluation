"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { completionsOn, remainingOn } from "@/features/appearance/lib/stats";
import type { CareRoutineItem } from "@/features/appearance/types";

/**
 * Календарь процедур — the month at a glance, and the way into any past day.
 *
 * Cells count completions rather than showing a tick, because this grid covers
 * the whole section rather than one routine: "3" on Tuesday is a more useful
 * answer than a checkmark that cannot say whether one routine or five happened.
 * A day that owed something and got nothing is the only red state — a Sunday a
 * weekday-only routine skipped is grey by design, not out of failure.
 *
 * Navigation is bounded by the loaded window at one end and the current month
 * at the other: paging into a month whose history was never fetched would
 * render every day as a miss, which is a lie the UI must not be able to tell.
 */
export function CareMonthCalendar({
  routines,
  today,
  windowStart,
  selectedDay,
  onSelectDay,
}: {
  routines: CareRoutineItem[];
  today: CalendarDay;
  windowStart: CalendarDay;
  selectedDay: CalendarDay;
  onSelectDay: (day: CalendarDay) => void;
}) {
  const [anchor, setAnchor] = useState<CalendarDay>(startOfMonth(selectedDay));

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
          const label = day.slice(-2).replace(/^0/, "");
          const inWindow = diffDays(windowStart, day) >= 0 && diffDays(day, today) >= 0;

          const done = inWindow ? completionsOn(routines, day) : 0;
          // Today is still in progress: it has not been missed until it is over.
          const missed =
            inWindow && day !== today && remainingOn(routines, day).length > 0 && done === 0;

          return (
            <button
              key={day}
              type="button"
              disabled={!inWindow}
              onClick={() => onSelectDay(day)}
              aria-label={`${label} ${formatMonth(anchor)}`}
              aria-pressed={day === selectedDay}
              className="block rounded-lg disabled:pointer-events-none"
            >
              <span
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-lg text-[0.75rem] transition-colors duration-200",
                  cellClass(done, missed, inWindow),
                  day === selectedDay && "ring-2 ring-inset ring-accent",
                  day === today && day !== selectedDay && "ring-1 ring-inset ring-accent-border",
                )}
              >
                {done > 0 ? <span className="numeric font-semibold">{done}</span> : label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
        <Legend className="bg-positive" label="выполнено" />
        <Legend className="border border-destructive/35 bg-destructive-muted" label="пропущено" />
        <Legend className="border border-white/6" label="без плана" />
      </div>
    </div>
  );
}

function cellClass(done: number, missed: boolean, inWindow: boolean): string {
  if (!inWindow) return "text-subtle-foreground/30";
  if (done > 0) return "bg-positive text-background font-semibold";
  if (missed) return "border border-destructive/35 bg-destructive-muted text-destructive";
  return "border border-white/6 text-subtle-foreground";
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-[0.25rem]", className)} aria-hidden />
      <span className="text-[0.6875rem] text-subtle-foreground">{label}</span>
    </span>
  );
}
