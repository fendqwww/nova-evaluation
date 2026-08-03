"use client";

import { Moon } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { formatDuration } from "@/features/sleep/lib/duration";
import { SLEEP_GOAL_MIN } from "@/features/sleep/lib/stats";
import { nightsWord } from "@/features/sleep/lib/format";
import { MiniBarChart } from "@/features/reports/components/mini-bar-chart";
import type { ReportsSnapshot } from "@/features/reports/types";

export function ReportsSleepCard({
  sleep,
  series,
  today,
}: {
  sleep: ReportsSnapshot["sleep"];
  series: { day: string; value: number }[];
  today: string;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-3">
          <IconChip tone="goal" size="md">
            <Moon className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">Сон</p>
            <p className="text-caption text-muted-foreground">
              {sleep.hasLogs
                ? `${sleep.daysLoggedWeek} из 7 ночей записано`
                : "Ещё не записывали сон"}
            </p>
          </div>
          {sleep.hasLogs && (
            <span className="numeric shrink-0 text-title text-foreground">
              {formatDuration(sleep.averageDurationMin)}
            </span>
          )}
        </div>

        {sleep.hasLogs && (
          <>
            <MiniBarChart series={series} today={today} goal={SLEEP_GOAL_MIN} barClassName="bg-accent" metGoalClassName="bg-tint-purple" />

            <p className="text-caption text-muted-foreground">
              Среднее качество {sleep.averageQuality > 0 ? `${sleep.averageQuality} из 5` : "—"}
              {sleep.streak >= 3 && ` · ${sleep.streak} ${nightsWord(sleep.streak)} подряд`}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
