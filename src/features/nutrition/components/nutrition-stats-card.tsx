"use client";

import { BarChart3 } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatCalories, formatWater, daysWord } from "@/features/nutrition/lib/format";
import { dailySeries, weekStats, type WeekStats } from "@/features/nutrition/lib/stats";
import {
  WEEKDAY_SHORT,
  startOfWeek,
  weekdayIndex,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import type { NutritionEntryItem, NutritionGoalItem, NutritionWaterItem } from "@/features/nutrition/types";

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
 * A calorie bar per day of the current week — hand-rolled with plain
 * divs, the same convention every stats card in this app uses (see the note
 * in workouts-stats-card.tsx and life-score-breakdown-modal.tsx): no charting
 * library is installed, and a week of bars does not need one.
 */
function WeekBars({
  series,
  goal,
  today,
}: {
  series: { day: CalendarDay; calories: number }[];
  goal: number;
  today: CalendarDay;
}) {
  const max = Math.max(goal, ...series.map((day) => day.calories), 1);

  return (
    <div className="flex items-end justify-between gap-1.5 pt-2">
      {series.map((day) => {
        const heightRatio = Math.min(1, day.calories / max);
        const isToday = day.day === today;
        const isFuture = day.calories === 0 && day.day > today;

        return (
          <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-20 w-full items-end">
              <div
                className={
                  isFuture
                    ? "w-full rounded-t bg-fill-subtle"
                    : day.calories > goal && goal > 0
                      ? "w-full rounded-t bg-warning"
                      : "w-full rounded-t bg-accent"
                }
                style={{ height: `${Math.max(3, heightRatio * 100)}%` }}
              />
            </div>
            <span
              className={
                isToday
                  ? "text-micro font-semibold text-foreground"
                  : "text-micro text-subtle-foreground"
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

export function NutritionStatsCard({
  entries,
  water,
  goal,
  today,
}: {
  entries: NutritionEntryItem[];
  water: NutritionWaterItem[];
  goal: NutritionGoalItem;
  today: CalendarDay;
}) {
  const stats: WeekStats = weekStats(entries, water, goal, today);
  const series = dailySeries(entries, water, startOfWeek(today), today);

  if (stats.daysLogged === 0) {
    return (
      <EmptyState
        className="py-10"
        icon={<BarChart3 className="h-5 w-5" />}
        title="Здесь появится твоя неделя"
        description="Запиши первый приём пищи — здесь появятся калории, макросы и вода за семь дней."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-col gap-1 p-4">
          <p className="text-caption text-muted-foreground">Эта неделя</p>
          <WeekBars series={series} goal={goal.calories} today={today} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col divide-y divide-border px-4">
          <StatRow
            label="Дней с записями"
            value={`${stats.daysLogged} из ${series.length}`}
          />
          <StatRow label="Средние калории" value={formatCalories(stats.averageCalories)} />
          <StatRow
            label="Средние белки / жиры / углеводы"
            value={`${stats.averageProteinG} / ${stats.averageFatG} / ${stats.averageCarbsG} г`}
          />
          <StatRow label="Среднее потребление воды" value={formatWater(stats.averageWaterMl)} />
          {goal.calories > 0 && (
            <StatRow
              label="Дней в пределах цели"
              value={`${stats.daysOnTarget} ${daysWord(stats.daysOnTarget)}`}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
