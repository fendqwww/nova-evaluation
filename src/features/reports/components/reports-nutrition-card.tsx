"use client";

import { Droplet, Salad } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { formatCalories, formatWater, daysWord } from "@/features/nutrition/lib/format";
import { MiniBarChart } from "@/features/reports/components/mini-bar-chart";
import type { ReportsSnapshot } from "@/features/reports/types";

export function ReportsNutritionCard({
  nutrition,
  calorieSeries,
  waterSeries,
  today,
}: {
  nutrition: ReportsSnapshot["nutrition"];
  calorieSeries: { day: string; value: number }[];
  waterSeries: { day: string; value: number }[];
  today: string;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-3">
          <IconChip tone="score" size="md">
            <Salad className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">Питание</p>
            <p className="text-caption text-muted-foreground">
              {nutrition.hasGoal
                ? `Дневник ведётся ${nutrition.daysLoggedWeek} из 7 дней`
                : "Дневная цель по калориям не задана"}
            </p>
          </div>
          {nutrition.caloriesToday > 0 && (
            <span className="numeric shrink-0 text-caption font-semibold text-foreground">
              {formatCalories(nutrition.caloriesToday)}
              {nutrition.caloriesGoal > 0 && (
                <span className="font-normal text-subtle-foreground"> / {formatCalories(nutrition.caloriesGoal)}</span>
              )}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-caption text-subtle-foreground">Калории по дням</p>
          <MiniBarChart series={calorieSeries} today={today} goal={nutrition.caloriesGoal || undefined} barClassName="bg-accent" />
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <div className="flex items-center gap-1.5 text-caption text-subtle-foreground">
            <Droplet className="h-3 w-3" />
            Вода — {formatWater(nutrition.waterTodayMl)}
            {nutrition.waterGoalMl > 0 && ` из ${formatWater(nutrition.waterGoalMl)}`}
          </div>
          <MiniBarChart
            series={waterSeries}
            today={today}
            goal={nutrition.waterGoalMl || undefined}
            barClassName="bg-tint-blue"
            metGoalClassName="bg-tint-cyan"
          />
        </div>

        {nutrition.streak >= 3 && (
          <p className="text-caption text-muted-foreground">
            Дневник ведётся {nutrition.streak} {daysWord(nutrition.streak)} подряд
          </p>
        )}
      </div>
    </Card>
  );
}
