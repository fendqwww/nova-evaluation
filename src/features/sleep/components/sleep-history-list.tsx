"use client";

import { ChevronRight, History, Star } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { MONTH_NOMINATIVE, formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { formatDuration } from "@/features/sleep/lib/duration";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * Every logged night, newest first, grouped by month — the same shape as
 * WorkoutHistoryList, for the same reason: "как я спал в марте" is a
 * question a flat list of dated rows makes take scrolling to answer.
 */
export function SleepHistoryList({
  logs,
  today,
  onOpen,
}: {
  logs: SleepLogItem[];
  today: CalendarDay;
  onOpen: (log: SleepLogItem) => void;
}) {
  if (logs.length === 0) {
    return (
      <EmptyState
        className="py-10"
        icon={<History className="h-5 w-5" />}
        title="Ночей пока нет"
        description="Каждая записанная ночь останется здесь — время, часы и качество сна."
      />
    );
  }

  const ordered = [...logs].sort((a, b) => b.day.localeCompare(a.day));

  const months = new Map<string, SleepLogItem[]>();
  for (const log of ordered) {
    const key = log.day.slice(0, 7);
    const bucket = months.get(key);
    if (bucket) bucket.push(log);
    else months.set(key, [log]);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...months.entries()].map(([month, items]) => {
        const [year, monthIndex] = month.split("-").map(Number);
        const averageMin = Math.round(
          items.reduce((total, log) => total + log.durationMin, 0) / items.length,
        );

        return (
          <div key={month} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-section text-muted-foreground">
                {MONTH_NOMINATIVE[monthIndex - 1]}
                {String(year) !== today.slice(0, 4) && ` ${year}`}
              </span>
              <span className="numeric text-[0.6875rem] text-subtle-foreground">
                в среднем {formatDuration(averageMin)}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {items.map((log) => (
                <Card key={log.id} elevation="raised" className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onOpen(log)}
                    className="press-sm flex w-full items-center gap-2.5 p-3 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-tint-purple-muted text-tint-purple ring-1 ring-inset ring-white/6">
                      <Star className={cn("h-4 w-4", log.quality >= 4 && "fill-current")} />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-caption font-semibold text-foreground">
                        {formatDay(log.day, today)}
                      </span>
                      <span className="numeric text-[0.6875rem] text-subtle-foreground">
                        {log.bedTime} – {log.wakeTime}
                      </span>
                    </span>

                    <span className="numeric shrink-0 text-caption font-semibold text-foreground">
                      {formatDuration(log.durationMin)}
                    </span>

                    <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
