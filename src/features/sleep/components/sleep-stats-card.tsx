"use client";

import { BarChart3, Flame } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { WEEKDAY_SHORT, startOfWeek, weekdayIndex, type CalendarDay } from "@/shared/lib/calendar-day";
import { formatDuration, hoursDecimal } from "@/features/sleep/lib/duration";
import { nightsWord } from "@/features/sleep/lib/format";
import {
  SLEEP_GOAL_MIN,
  dailySeries,
  loggingStreak,
  overallStats,
  weekStats,
} from "@/features/sleep/lib/stats";
import type { SleepLogItem } from "@/features/sleep/types";

interface StatRowProps {
  label: string;
  value: string;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="numeric text-body font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * A duration bar per day of the current week — hand-rolled with plain divs,
 * the same convention every stats card in this app uses (no charting library
 * installed, and a week of bars does not need one).
 */
function WeekBars({
  series,
  today,
}: {
  series: { day: CalendarDay; durationMin: number }[];
  today: CalendarDay;
}) {
  const max = Math.max(SLEEP_GOAL_MIN, ...series.map((day) => day.durationMin), 1);

  return (
    <div className="flex items-end justify-between gap-1.5 pt-2">
      {series.map((day) => {
        const heightRatio = Math.min(1, day.durationMin / max);
        const isToday = day.day === today;
        const isFuture = day.durationMin === 0 && day.day > today;

        return (
          <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-20 w-full items-end">
              <div
                className={
                  isFuture
                    ? "w-full rounded-t bg-white/[0.04]"
                    : day.durationMin >= SLEEP_GOAL_MIN
                      ? "w-full rounded-t bg-tint-purple"
                      : "w-full rounded-t bg-accent"
                }
                style={{ height: `${Math.max(3, heightRatio * 100)}%` }}
              />
            </div>
            <span
              className={
                isToday
                  ? "text-[0.6875rem] font-semibold text-foreground"
                  : "text-[0.6875rem] text-subtle-foreground"
              }
            >
              {WEEKDAY_SHORT[weekdayIndex(day.day)]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SleepStatsCard({ logs, today }: { logs: SleepLogItem[]; today: CalendarDay }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        className="py-10"
        icon={<BarChart3 className="h-5 w-5" />}
        title="Статистики пока нет"
        description="Запишите первую ночь — и здесь появятся часы сна, качество и недельный график."
      />
    );
  }

  const week = weekStats(logs, today);
  const all = overallStats(logs);
  const streak = loggingStreak(logs, today);
  const series = dailySeries(logs, startOfWeek(today), today);

  return (
    <div className="flex flex-col gap-3">
      <Card elevation="raised">
        <div className="flex flex-col gap-3.5 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="numeric text-[2rem] font-bold leading-none tracking-[-0.045em] text-foreground">
                {hoursDecimal(week.averageDurationMin)}
              </span>
              <span className="text-caption text-muted-foreground">ч в среднем на этой неделе</span>
            </div>

            {streak > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-md bg-tint-orange-muted px-1.5 py-0.5 text-[0.6875rem] font-semibold text-tint-orange">
                <Flame className="h-3 w-3" />
                <span className="numeric">
                  {streak} {nightsWord(streak)}
                </span>
              </span>
            )}
          </div>

          <p className="text-caption text-muted-foreground">Эта неделя</p>
          <WeekBars series={series} today={today} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col divide-y divide-border px-4">
          <StatRow
            label="Ночей записано на неделе"
            value={`${week.daysLogged} из ${series.length}`}
          />
          <StatRow label="Средняя продолжительность" value={formatDuration(week.averageDurationMin)} />
          <StatRow label="Среднее качество" value={week.averageQuality > 0 ? `${week.averageQuality} из 5` : "—"} />
          <StatRow
            label="Ночей с целью 8 ч"
            value={`${week.daysOnTarget} ${nightsWord(week.daysOnTarget)}`}
          />
          <StatRow
            label={`Всего записей (${all.totalLogged} ${nightsWord(all.totalLogged)})`}
            value={formatDuration(all.averageDurationMinAll)}
          />
        </div>
      </Card>
    </div>
  );
}
