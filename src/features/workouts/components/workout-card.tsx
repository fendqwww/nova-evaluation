"use client";

import { motion } from "framer-motion";
import { Archive, Check, ChevronRight, Flame, Play } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { categoryOption } from "@/features/workouts/lib/categories";
import { planSummary } from "@/features/workouts/lib/plan";
import {
  activeExercises,
  streakUnitNoun,
  workoutStats,
} from "@/features/workouts/lib/stats";
import {
  adherenceTextClass,
  startButtonClass,
  streakBadgeClass,
  workoutTone,
} from "@/features/workouts/lib/tone";
import { exercisesWord, formatVolume, sessionsWord } from "@/features/workouts/lib/format";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";

/**
 * A programme as a running record, not a checkbox.
 *
 * The headline number is the streak, the same way it is on a habit card,
 * because that is the number a programme exists to grow. Adherence sits beside
 * it as the counterweight so a long streak on a two-day plan cannot masquerade
 * as consistency — and for a workout with no plan the percentage is replaced by
 * the raw session count rather than shown as a vacuous 0%.
 *
 * The start control and the body are siblings, never nested: a button inside a
 * button is invalid HTML and the inner one stops receiving taps in some
 * engines. Starting a session and opening the programme are two targets.
 */
export function WorkoutCard({
  workout,
  sessions,
  today,
  windowStart,
  onStart,
  onOpen,
}: {
  workout: WorkoutItem;
  sessions: WorkoutSessionItem[];
  today: CalendarDay;
  windowStart: CalendarDay;
  onStart: () => void;
  onOpen: () => void;
}) {
  const stats = workoutStats(workout, sessions, today, windowStart);
  const isArchived = workout.archivedAt !== null;
  const tone = workoutTone(stats, isArchived);
  const category = categoryOption(workout.category);
  const CategoryIcon = category.icon;
  const exerciseCount = activeExercises(workout.exercises).length;

  return (
    <Card
      elevation={isArchived ? "inset" : "raised"}
      className="overflow-hidden transition-colors duration-200"
    >
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-start gap-2.5">
          {isArchived ? (
            <span className="mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-subtle-foreground">
              <Archive className="h-3.5 w-3.5" />
            </span>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={onStart}
              aria-label={
                stats.isDoneToday
                  ? "Тренировка выполнена — открыть"
                  : stats.isOpenToday
                    ? "Продолжить тренировку"
                    : "Начать тренировку"
              }
              className={cn(
                "mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                startButtonClass(tone),
              )}
            >
              {stats.isDoneToday ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : (
                <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
              )}
            </motion.button>
          )}

          <button
            type="button"
            onClick={onOpen}
            className="press-sm flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "text-[1.0625rem] font-semibold leading-snug tracking-[-0.018em]",
                  isArchived ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {workout.title}
              </span>
              <span className="flex items-center gap-1.5 text-caption text-subtle-foreground">
                <CategoryIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {category.short} · {planSummary(workout.weekdayMask)}
                  {exerciseCount > 0 &&
                    ` · ${exerciseCount} ${exercisesWord(exerciseCount)}`}
                </span>
              </span>
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-subtle-foreground" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="press-sm flex items-end justify-between gap-3 text-left"
        >
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "numeric text-[2rem] font-bold leading-none tracking-[-0.045em]",
                stats.currentStreak > 0 && !isArchived
                  ? "text-foreground"
                  : "text-subtle-foreground",
              )}
            >
              {stats.currentStreak}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-caption text-muted-foreground">
                {streakUnitNoun(stats.currentStreak, stats.streakUnit)} подряд
              </span>
              {stats.currentStreak > 0 && !isArchived && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
                    streakBadgeClass(stats.currentStreak),
                  )}
                >
                  <Flame className="h-3 w-3" />
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="numeric text-caption font-semibold text-foreground">
              {stats.week.done} из {stats.week.target} на неделе
            </span>
            <span
              className={cn(
                "numeric text-[0.75rem]",
                stats.adherence === null
                  ? "text-muted-foreground"
                  : adherenceTextClass(stats.adherence),
              )}
            >
              {stats.adherence === null
                ? `${stats.sessionsDone} ${sessionsWord(stats.sessionsDone)} всего`
                : `${Math.round(stats.adherence * 100)}% за месяц`}
            </span>
          </div>
        </button>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-[0.6875rem] text-subtle-foreground">
            {stats.isOpenToday
              ? "Тренировка идёт — не завершена"
              : stats.isDoneToday
                ? "Сегодня выполнено"
                : stats.lastDay
                  ? `Последняя: ${formatDay(stats.lastDay, today)}`
                  : "Ещё ни разу не выполнена"}
          </span>
          {stats.volumeKg > 0 && (
            <span className="numeric shrink-0 text-[0.6875rem] font-medium text-muted-foreground">
              {formatVolume(stats.volumeKg)} за полгода
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
