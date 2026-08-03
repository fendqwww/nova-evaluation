"use client";

import { WEEKDAY_SHORT, weekdayIndex, type CalendarDay } from "@/shared/lib/calendar-day";
import { cn } from "@/shared/lib/cn";

export interface MiniBarChartPoint {
  day: CalendarDay;
  value: number;
}

/**
 * A value-per-day bar chart, hand-rolled with plain divs — the same
 * convention every stats card in this app uses (see the note in
 * workouts-stats-card.tsx): no charting library is installed. Generalised
 * over WeekBars/SleepStatsCard's version to also render a 30-bar month view,
 * where individual weekday letters would not fit and are dropped in favour of
 * the two edge dates passed in by the caller.
 */
export function MiniBarChart({
  series,
  today,
  goal,
  barClassName = "bg-accent",
  metGoalClassName = "bg-tint-purple",
}: {
  series: MiniBarChartPoint[];
  today: CalendarDay;
  goal?: number;
  barClassName?: string;
  metGoalClassName?: string;
}) {
  const max = Math.max(goal ?? 0, ...series.map((point) => point.value), 1);
  const showWeekdayLabels = series.length <= 7;

  return (
    <div className={cn("flex items-end pt-2", showWeekdayLabels ? "gap-1.5" : "gap-[3px]")}>
      {series.map((point) => {
        const ratio = Math.min(1, point.value / max);
        const isToday = point.day === today;
        const metGoal = goal !== undefined && goal > 0 && point.value >= goal;
        const isFuture = point.value === 0 && point.day > today;

        return (
          <div key={point.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-16 w-full items-end">
              <div
                className={cn(
                  "w-full rounded-t transition-[height] duration-300",
                  isFuture ? "bg-white/[0.04]" : metGoal ? metGoalClassName : barClassName,
                  isToday && !isFuture && "ring-1 ring-inset ring-white/40",
                )}
                style={{ height: `${point.value > 0 ? Math.max(4, ratio * 100) : 0}%` }}
              />
            </div>
            {showWeekdayLabels && (
              <span
                className={cn(
                  "text-[0.625rem]",
                  isToday ? "font-semibold text-foreground" : "text-subtle-foreground",
                )}
              >
                {WEEKDAY_SHORT[weekdayIndex(point.day)]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
