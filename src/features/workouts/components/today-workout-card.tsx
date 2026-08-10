"use client";

import { Check, Dumbbell, Play } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { haptics } from "@/shared/lib/haptics";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { workoutStats } from "@/features/workouts/lib/stats";
import { planSummary } from "@/features/workouts/lib/plan";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";
import type { WorkoutStats } from "@/features/workouts/lib/stats";

/**
 * Today's session, as the first thing on the screen.
 *
 * The section used to open with a week ring and then a search field, a sort
 * control and a filter row — a management console for a collection that, for a
 * real user, holds two to four programmes. It answered "what do I have" before
 * anyone had asked, and never answered "what am I doing today", which is the
 * only question someone opens a training app to ask.
 *
 * A rest day says so and says when the next session is, rather than rendering
 * an empty state that reads as a failure. Not training on a Tuesday is the plan
 * working, not the plan being ignored.
 */
export function TodayWorkoutCard({
  workouts,
  sessions,
  today,
  windowStart,
  weekDone,
  weekTarget,
  isStarting,
  onStart,
  onOpen,
}: {
  workouts: WorkoutItem[];
  sessions: WorkoutSessionItem[];
  today: CalendarDay;
  windowStart: CalendarDay;
  weekDone: number;
  weekTarget: number;
  isStarting: boolean;
  onStart: (workoutId: string) => void;
  onOpen: (workoutId: string) => void;
}) {
  const rows: { workout: WorkoutItem; stats: WorkoutStats }[] = workouts
    .filter((workout) => workout.archivedAt === null)
    .map((workout) => ({
      workout,
      stats: workoutStats(workout, sessions, today, windowStart),
    }))
    .filter((row) => row.stats.isPlannedToday || row.stats.isOpenToday || row.stats.isDoneToday);

  const open = rows.find((row) => row.stats.isOpenToday) ?? null;
  const pending = rows.find((row) => !row.stats.isDoneToday) ?? null;
  const target = open ?? pending;
  const doneToday = rows.filter((row) => row.stats.isDoneToday).length;
  const allDone = rows.length > 0 && target === null;

  return (
    <Card elevation="lifted">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3.5">
          <IconChip tone={allDone ? "score" : "task"} size="lg">
            {allDone ? <Check className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
          </IconChip>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-label uppercase text-muted-foreground">
              {open ? "Тренировка идёт" : "Сегодня"}
            </p>

            {target ? (
              <>
                <p className="truncate text-title text-foreground">{target.workout.title}</p>
                <p className="text-caption text-muted-foreground">
                  {target.workout.exercises.filter((exercise) => exercise.archivedAt === null).length}{" "}
                  {pluralizeRu(
                    target.workout.exercises.filter((exercise) => exercise.archivedAt === null)
                      .length,
                    ["упражнение", "упражнения", "упражнений"],
                  )}
                  {" · "}
                  {planSummary(target.workout.weekdayMask)}
                </p>
              </>
            ) : allDone ? (
              <>
                <p className="text-title text-positive">
                  {doneToday === 1 ? "Тренировка выполнена" : `Выполнено: ${doneToday}`}
                </p>
                <p className="text-caption text-muted-foreground">
                  На сегодня всё закрыто — следующая по плану
                </p>
              </>
            ) : (
              <>
                <p className="text-title text-foreground">День отдыха</p>
                <p className="text-caption text-muted-foreground">
                  По плану сегодня тренировок нет. Восстановление — часть программы.
                </p>
              </>
            )}
          </div>
        </div>

        {target && (
          <div className="flex gap-2">
            <Button
              size="lg"
              className="flex-1"
              disabled={isStarting}
              onClick={() => {
                // Средний удар, а не лёгкий: начало тренировки — самое
                // весомое действие в приложении, и отклик должен отличаться
                // от отметки стакана воды.
                haptics.press();
                onStart(target.workout.id);
              }}
            >
              <Play className="h-4 w-4" />
              {open ? "Продолжить" : "Начать тренировку"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                haptics.tap();
                onOpen(target.workout.id);
              }}
            >
              План
            </Button>
          </div>
        )}

        {weekTarget > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-caption text-muted-foreground">На этой неделе</span>
              <span className="numeric text-caption font-medium text-foreground">
                {weekDone} из {weekTarget}
              </span>
            </div>
            <Progress
              value={weekTarget === 0 ? 0 : weekDone / weekTarget}
              fillClass={weekDone >= weekTarget ? "bg-positive" : "bg-accent"}
              label="Тренировки за неделю"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
