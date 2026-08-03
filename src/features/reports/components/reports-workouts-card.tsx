"use client";

import { Dumbbell } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { formatVolume, sessionsWord } from "@/features/workouts/lib/format";
import { MiniBarChart } from "@/features/reports/components/mini-bar-chart";
import type { ReportsSnapshot } from "@/features/reports/types";

export function ReportsWorkoutsCard({
  workouts,
  series,
  today,
}: {
  workouts: ReportsSnapshot["workouts"];
  series: { day: string; value: number }[];
  today: string;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-3">
          <IconChip tone="score" size="md">
            <Dumbbell className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">Тренировки</p>
            <p className="text-caption text-muted-foreground">
              {workouts.weekDone === 0
                ? "На этой неделе ещё не было"
                : `${workouts.weekDone} ${sessionsWord(workouts.weekDone)} за неделю · ${formatVolume(workouts.volumeWeekKg)}`}
            </p>
          </div>
          <span className="numeric shrink-0 text-title text-foreground">
            {Math.round(workouts.adherenceWeek * 100)}%
          </span>
        </div>

        <MiniBarChart series={series} today={today} barClassName="bg-tint-green" />
      </div>
    </Card>
  );
}
