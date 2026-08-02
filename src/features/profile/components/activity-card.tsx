"use client";

import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { weekdayIndex } from "@/shared/lib/calendar-day";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { ActivityDay, ProfileCounts } from "@/features/profile/types";

/**
 * Thirty days of showing up, as bars.
 *
 * Bars rather than a line: the series is a count of discrete actions per day
 * with plenty of zeros, and a line drawn through zeros implies a continuous
 * quantity that was never measured. Height is relative to the busiest day in
 * the window rather than to a fixed ceiling, so a quiet month still reads as a
 * shape instead of a flat line — the chart is about rhythm, not volume.
 *
 * A zero day is drawn as a visible stub rather than nothing at all: an empty
 * column and a missing column look identical, and only one of them is true.
 */
export function ActivityCard({
  activity,
  counts,
  chartDays,
}: {
  activity: ActivityDay[];
  counts: ProfileCounts;
  chartDays: number;
}) {
  const window = activity.slice(-chartDays);
  const peak = window.reduce((max, entry) => Math.max(max, entry.count), 0);
  const total = window.reduce((sum, entry) => sum + entry.count, 0);
  const activeDays = window.filter((entry) => entry.count > 0).length;

  return (
    <Card>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-heading text-foreground">Активность</p>
            <p className="text-caption text-muted-foreground">
              {activeDays} из {window.length}{" "}
              {pluralizeRu(window.length, ["дня", "дней", "дней"])} · {total}{" "}
              {pluralizeRu(total, ["действие", "действия", "действий"])}
            </p>
          </div>
        </div>

        <div className="flex h-24 items-end gap-[3px]">
          {window.map((entry) => {
            const ratio = peak === 0 ? 0 : entry.count / peak;
            const isWeekend = weekdayIndex(entry.day) >= 5;

            return (
              <div
                key={entry.day}
                className="group flex flex-1 flex-col justify-end"
                title={`${entry.day}: ${entry.count}`}
              >
                <div
                  className={cn(
                    "w-full rounded-[2px] transition-colors duration-200",
                    entry.count === 0
                      ? "bg-white/[0.07]"
                      : isWeekend
                        ? "bg-accent/60"
                        : "bg-accent",
                  )}
                  // Zero days keep a 3px stub so an empty day is visibly a day.
                  style={{ height: entry.count === 0 ? 3 : `${Math.max(8, ratio * 100)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Only the ends are labelled: thirty ticks would be unreadable at this
            width, and the two that matter are where the window starts and now. */}
        <div className="flex items-center justify-between text-caption text-subtle-foreground">
          <span>{window.length} дней назад</span>
          <span>сегодня</span>
        </div>

        <div className="grid grid-cols-4 gap-2 border-t border-border pt-4">
          <Counter value={counts.goalsActive} label="Цели" />
          <Counter value={counts.habitsActive} label="Привычки" />
          <Counter value={counts.tasksOpen} label="Задачи" />
          <Counter value={counts.workoutsActive} label="Программы" />
        </div>
      </div>
    </Card>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="numeric text-title text-foreground">{value}</span>
      <span className="text-caption text-subtle-foreground">{label}</span>
    </div>
  );
}
