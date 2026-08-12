"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Archive, ArchiveRestore, Flame, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalTitle } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { GoalProgressBar } from "@/features/goals/components/goal-progress-bar";
import { WorkoutMonthCalendar } from "@/features/workouts/components/workout-month-calendar";
import { ExerciseProgressList } from "@/features/workouts/components/exercise-progress-list";
import { categoryOption } from "@/features/workouts/lib/categories";
import { describePlan } from "@/features/workouts/lib/plan";
import {
  ADHERENCE_DAYS,
  activeExercises,
  dayState,
  sessionsOf,
  streakUnitNoun,
  workoutStats,
} from "@/features/workouts/lib/stats";
import {
  adherenceTextClass,
  progressFillClass,
  streakBadgeClass,
} from "@/features/workouts/lib/tone";
import {
  formatLoad,
  formatTarget,
  formatRest,
  formatVolume,
  sessionsWord,
} from "@/features/workouts/lib/format";
import { deleteWorkoutAction } from "@/features/workouts/server/delete-workout.action";
import { setWorkoutArchivedAction } from "@/features/workouts/server/set-workout-archived.action";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";

function SectionLabel({ children, trailing }: { children: string; trailing?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-label text-subtle-foreground">{children}</span>
      {trailing && (
        <span className="numeric text-caption text-muted-foreground">{trailing}</span>
      )}
    </div>
  );
}

function Stat({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span
        className={cn(
          "numeric text-page font-bold leading-none tracking-[-0.03em]",
          className,
        )}
      >
        {value}
      </span>
      <span className="text-center text-micro text-subtle-foreground">{label}</span>
    </div>
  );
}

/**
 * The programme opened up: the numbers it has produced, the plan that produced
 * them, the month it happened in, and the controls that change it.
 *
 * The hero panel carries everything quantitative so the state of the programme
 * is one glance, mirroring GoalDetailModal and HabitDetailModal. The calendar
 * below is not a read-out — it is the editing surface for any day the card
 * cannot reach, and ticking a day there records a session with no sets, which
 * is the honest way to log "я потренил, но не записывал".
 *
 * GoalProgressBar is reused rather than reimplemented: it takes a ratio and a
 * fill class and has no goal-specific behaviour.
 */
export function WorkoutDetailModal({
  workout,
  sessions,
  today,
  windowStart,
  open,
  onOpenChange,
  onEdit,
  onStart,
  onToggleDay,
  onOpenSession,
  onChanged,
  onDeleted,
}: {
  workout: WorkoutItem | null;
  sessions: WorkoutSessionItem[];
  today: CalendarDay;
  windowStart: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onStart: () => void;
  onToggleDay: (day: CalendarDay, isDone: boolean) => void;
  onOpenSession: (sessionId: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const rawInitData = useRawInitData();
  // Reset by remount, not by an effect: the parent bumps this component's key
  // on every open, so reopening can never inherit an already-armed delete.
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const archive = useMutation({
    mutationFn: setWorkoutArchivedAction,
    onSuccess: onChanged,
  });

  const removeWorkout = useMutation({
    mutationFn: deleteWorkoutAction,
    onSuccess: () => {
      onOpenChange(false);
      onDeleted();
    },
  });

  if (!workout) return null;

  const workoutId = workout.id;
  const isArchived = workout.archivedAt !== null;
  const stats = workoutStats(workout, sessions, today, windowStart);
  const own = sessionsOf(sessions, workout.id);
  const exercises = activeExercises(workout.exercises);
  const category = categoryOption(workout.category);
  const CategoryIcon = category.icon;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 pr-8">
            <IconChip tone="score" size="md">
              <CategoryIcon className="h-4 w-4" />
            </IconChip>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <ModalTitle
                className={cn(
                  "text-title font-semibold leading-snug tracking-[-0.02em]",
                  isArchived && "text-muted-foreground",
                )}
              >
                {workout.title}
              </ModalTitle>
              <p className="text-caption text-subtle-foreground">
                {category.label} · {describePlan(workout.weekdayMask)}
                {isArchived && " · в архиве"}
              </p>
            </div>
          </div>

          <Card elevation="inset" className="rounded-2xl">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "numeric text-metric-2xl font-bold leading-none tracking-[-0.045em]",
                    stats.currentStreak > 0 && !isArchived
                      ? "text-foreground"
                      : "text-subtle-foreground",
                  )}
                >
                  {stats.currentStreak}
                </span>
                <span className="text-caption text-muted-foreground">
                  {streakUnitNoun(stats.currentStreak, stats.streakUnit)} подряд
                </span>
                {stats.currentStreak > 0 && !isArchived && (
                  <span
                    className={cn(
                      "flex items-center rounded-md px-1.5 py-0.5",
                      streakBadgeClass(stats.currentStreak),
                    )}
                  >
                    <Flame className="h-3 w-3" />
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-caption text-muted-foreground">На этой неделе</span>
                  <span className="numeric text-caption font-semibold text-foreground">
                    {stats.week.done} из {stats.week.target}
                  </span>
                </div>
                <GoalProgressBar
                  ratio={stats.week.ratio}
                  fillClass={progressFillClass(stats.week.ratio, isArchived)}
                  size="sm"
                />
              </div>

              <div className="flex items-stretch gap-2 border-t border-border pt-3">
                <Stat
                  value={
                    stats.adherence === null ? "—" : `${Math.round(stats.adherence * 100)}%`
                  }
                  label={
                    stats.adherence === null ? "плана нет" : `за ${ADHERENCE_DAYS} дней`
                  }
                  className={
                    isArchived ? "text-muted-foreground" : adherenceTextClass(stats.adherence)
                  }
                />
                <span className="w-px bg-fill-muted" aria-hidden />
                <Stat
                  value={String(stats.sessionsDone)}
                  label="всего за полгода"
                  className="text-foreground"
                />
                <span className="w-px bg-fill-muted" aria-hidden />
                <Stat
                  value={formatVolume(stats.volumeKg)}
                  label="объём за полгода"
                  className="text-foreground"
                />
              </div>
            </div>
          </Card>

          {workout.note && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>ОПИСАНИЕ</SectionLabel>
              <p className="whitespace-pre-line text-body text-muted-foreground">
                {workout.note}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <SectionLabel trailing={exercises.length > 0 ? `${exercises.length}` : undefined}>
              УПРАЖНЕНИЯ
            </SectionLabel>

            {exercises.length === 0 ? (
              <p className="text-caption text-subtle-foreground">
                Упражнений нет — тренировка отмечается целиком.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {exercises.map((exercise, index) => (
                  <li
                    key={exercise.id}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-inset p-2.5"
                  >
                    <span className="numeric mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-fill-muted text-micro font-semibold text-subtle-foreground">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-caption font-medium text-foreground">
                        {exercise.name}
                      </span>
                      <span className="numeric text-micro text-subtle-foreground">
                        {formatTarget(exercise.targetSets, exercise.targetReps)} ·{" "}
                        {formatLoad(exercise.targetWeightKg)} · отдых{" "}
                        {formatRest(exercise.restSeconds)}
                      </span>
                      {exercise.note && (
                        <span className="text-micro text-muted-foreground">
                          {exercise.note}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <SectionLabel>КАЛЕНДАРЬ</SectionLabel>
            <WorkoutMonthCalendar
              today={today}
              windowStart={windowStart}
              disabled={isArchived}
              stateOf={(day) => dayState(workout, sessions, day, today)}
              onToggleDay={onToggleDay}
            />
          </div>

          {own.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel trailing={`${own.length} ${sessionsWord(own.length)}`}>
                ПОСЛЕДНИЕ
              </SectionLabel>
              <div className="flex flex-col gap-1.5">
                {[...own]
                  .reverse()
                  .slice(0, 5)
                  .map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onOpenSession(session.id)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-inset px-3 py-2 text-left transition-colors duration-200 active:border-border-strong"
                    >
                      <span className="text-caption text-foreground">
                        {formatDay(session.day, today)}
                      </span>
                      <span className="numeric text-micro text-subtle-foreground">
                        {session.completedAt === null
                          ? "не завершена"
                          : `${session.sets.length} подх.`}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <SectionLabel>ПРОГРЕСС</SectionLabel>
            <ExerciseProgressList exercises={workout.exercises} sessions={own} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {!isArchived && (
              <Button className="w-full" size="lg" onClick={onStart}>
                {stats.isDoneToday
                  ? "Открыть сегодняшнюю тренировку"
                  : stats.isOpenToday
                    ? "Продолжить тренировку"
                    : "Начать тренировку"}
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onEdit}>
                Изменить
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={archive.isPending}
                onClick={() =>
                  archive.mutate({ rawInitData, workoutId, isArchived: !isArchived })
                }
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    Вернуть
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />В архив
                  </>
                )}
              </Button>
            </div>

            {!isConfirmingDelete && (
              <Button
                variant="ghost"
                className="w-full text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            )}

            {isConfirmingDelete && (
              <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive-muted p-3">
                <p className="text-caption text-foreground">
                  Удалить тренировку вместе со всей историей подходов? Отменить будет
                  нельзя — чтобы просто перестать её выполнять, отправьте в архив.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={removeWorkout.isPending}
                    onClick={() => removeWorkout.mutate({ rawInitData, workoutId })}
                  >
                    {removeWorkout.isPending ? "Удаляем…" : "Удалить"}
                  </Button>
                </div>
              </div>
            )}

            {(archive.isError || removeWorkout.isError) && (
              <p className="text-caption text-destructive">
                Не удалось выполнить действие. Попробуй ещё раз.
              </p>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
