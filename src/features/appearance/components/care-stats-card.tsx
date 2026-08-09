"use client";

import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import {
  WEEKDAY_SHORT,
  daysBetween,
  startOfWeek,
  weekdayIndex,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { areaLabel } from "@/features/appearance/lib/areas";
import { formatPercent } from "@/features/appearance/lib/format";
import {
  areaBreakdown,
  completionsOn,
  daysWord,
  monthStats,
  remainingOn,
  weekStats,
} from "@/features/appearance/lib/stats";
import { adherenceTextClass } from "@/features/appearance/lib/tone";
import { photoCountsByArea } from "@/features/appearance/lib/history";
import type { CarePhotoItem, CareRoutineItem } from "@/features/appearance/types";

/**
 * Недельная и месячная статистика, and where care is weakest.
 *
 * Both ranges go through the same rangeStats function, so "за неделю" and "за
 * месяц" can never be two different calculations that disagree at the boundary
 * — the only difference between the two cards is the pair of days handed in.
 *
 * The bars are hand-rolled divs, the same convention every stats card in this
 * app uses (see nutrition-stats-card.tsx): no charting library is installed,
 * and a week of bars does not need one.
 */
export function CareStatsCard({
  routines,
  photos,
  today,
}: {
  routines: CareRoutineItem[];
  photos: CarePhotoItem[];
  today: CalendarDay;
}) {
  const week = weekStats(routines, today);
  const month = monthStats(routines, today);
  const areas = areaBreakdown(
    routines,
    photoCountsByArea(photos),
    month.from,
    month.to,
  );

  const series = daysBetween(startOfWeek(today), today).map((day) => ({
    day,
    done: completionsOn(routines, day),
    due: remainingOn(routines, day).length + completionsOn(routines, day),
  }));

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-col gap-1 p-4">
          <p className="text-caption text-muted-foreground">Эта неделя</p>
          <WeekBars series={series} today={today} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col divide-y divide-border px-4">
          <StatRow
            label="Выполнено за неделю"
            value={`${week.done} из ${week.expected}`}
            tone={week.expected > 0 ? adherenceTextClass(week.adherence) : undefined}
          />
          <StatRow label="Доля выполнения за неделю" value={formatPercent(week.adherence)} />
          <StatRow
            label="Дней без пропусков за неделю"
            value={`${week.perfectDays} ${daysWord(week.perfectDays)}`}
          />
          <StatRow
            label="Выполнено за месяц"
            value={`${month.done} из ${month.expected}`}
            tone={month.expected > 0 ? adherenceTextClass(month.adherence) : undefined}
          />
          <StatRow label="Доля выполнения за месяц" value={formatPercent(month.adherence)} />
          <StatRow
            label="Дней с уходом за месяц"
            value={`${month.activeDays} ${daysWord(month.activeDays)}`}
          />
        </div>
      </Card>

      {areas.length > 0 && (
        <Card>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-caption text-muted-foreground">По зонам, за месяц</p>
            <div className="flex flex-col gap-2.5">
              {areas.map((area) => (
                <div key={area.area} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-caption text-foreground">{areaLabel(area.area)}</span>
                    <span
                      className={cn(
                        "numeric text-caption",
                        area.expected > 0
                          ? adherenceTextClass(area.adherence)
                          : "text-subtle-foreground",
                      )}
                    >
                      {area.expected > 0
                        ? `${area.done} / ${area.expected}`
                        : `${area.photos} фото`}
                    </span>
                  </div>
                  {area.expected > 0 && (
                    <div className="h-1 overflow-hidden rounded-full bg-fill-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          area.adherence >= 0.8 ? "bg-positive" : "bg-accent",
                        )}
                        style={{ width: `${Math.round(area.adherence * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className={cn("numeric shrink-0 text-body font-medium text-foreground", tone)}>
        {value}
      </span>
    </div>
  );
}

/**
 * One bar per day of the current week: how much of what was due got done.
 *
 * A day with nothing due renders as an empty track rather than a full bar — a
 * vacuous 100% would be the loudest thing on the chart and would mean nothing.
 */
function WeekBars({
  series,
  today,
}: {
  series: { day: CalendarDay; done: number; due: number }[];
  today: CalendarDay;
}) {
  return (
    <div className="flex items-end justify-between gap-1.5 pt-2">
      {series.map((entry) => {
        const ratio = entry.due === 0 ? 0 : Math.min(1, entry.done / entry.due);
        const isToday = entry.day === today;

        return (
          <div key={entry.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-20 w-full items-end">
              <div
                className={
                  entry.due === 0
                    ? "w-full rounded-t bg-fill-subtle"
                    : ratio >= 1
                      ? "w-full rounded-t bg-positive"
                      : "w-full rounded-t bg-accent"
                }
                style={{ height: `${Math.max(3, ratio * 100)}%` }}
              />
            </div>
            <span
              className={
                isToday
                  ? "text-[0.6875rem] font-semibold text-foreground"
                  : "text-[0.6875rem] text-subtle-foreground"
              }
            >
              {WEEKDAY_SHORT[weekdayIndex(entry.day)]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
