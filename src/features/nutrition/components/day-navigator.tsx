"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { addDays, diffDays, formatDay, type CalendarDay } from "@/shared/lib/calendar-day";

/** Step one day at a time through the loaded window — never past today. */
export function DayNavigator({
  day,
  today,
  windowStart,
  onChange,
}: {
  day: CalendarDay;
  today: CalendarDay;
  windowStart: CalendarDay;
  onChange: (day: CalendarDay) => void;
}) {
  const canGoBack = diffDays(windowStart, day) > 0;
  const canGoForward = diffDays(day, today) > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        size="icon"
        variant="ghost"
        aria-label="Предыдущий день"
        disabled={!canGoBack}
        onClick={() => onChange(addDays(day, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-body font-medium text-foreground">
        {day === today ? "Сегодня" : formatDay(day, today)}
      </span>

      <Button
        size="icon"
        variant="ghost"
        aria-label="Следующий день"
        disabled={!canGoForward}
        onClick={() => onChange(addDays(day, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
