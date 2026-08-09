"use client";

import { Flame, Repeat } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { formatStreak } from "@/features/habits/lib/stats";
import { MiniBarChart } from "@/features/reports/components/mini-bar-chart";
import type { ReportsHabitRow, ReportsSnapshot } from "@/features/reports/types";

export function ReportsHabitsCard({
  habits,
  series,
  today,
}: {
  habits: ReportsSnapshot["habits"];
  series: { day: string; value: number }[];
  today: string;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-3">
          <IconChip tone="habit" size="md">
            <Repeat className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">Привычки</p>
            <p className="text-caption text-muted-foreground">
              {habits.activeCount === 0
                ? "Пока не заведено ни одной"
                : `${habits.doneToday} из ${habits.dueToday} сегодня · ${Math.round(habits.adherenceWeek * 100)}% за неделю`}
            </p>
          </div>
        </div>

        {habits.activeCount > 0 && (
          <>
            <MiniBarChart series={series} today={today} barClassName="bg-tint-orange" />

            {habits.top.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {habits.top.slice(0, 3).map((habit: ReportsHabitRow) => (
                  <div key={habit.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
                      {habit.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[0.6875rem] text-subtle-foreground">
                      {habit.currentStreak > 0 && (
                        <>
                          <Flame className="h-3 w-3 text-tint-orange" />
                          {formatStreak(habit.currentStreak, habit.streakUnit)}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
