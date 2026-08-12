"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Dumbbell, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";
import { GoalProgressBar } from "@/features/goals/components/goal-progress-bar";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { haptics } from "@/shared/lib/haptics";
import { RestTimer } from "@/features/workouts/components/rest-timer";
import { WorkoutExerciseRunner } from "@/features/workouts/components/workout-exercise-runner";
import { activeExercises, sessionStats, setsOf } from "@/features/workouts/lib/stats";
import { progressFillClass } from "@/features/workouts/lib/tone";
import {
  formatVolume,
  repsWord,
  setsWord,
} from "@/features/workouts/lib/format";
import { SESSION_NOTE_MAX, type WorkoutSetDraft } from "@/features/workouts/schemas";
import { setWorkoutSessionNoteAction } from "@/features/workouts/server/set-workout-session-note.action";
import { deleteWorkoutSessionAction } from "@/features/workouts/server/delete-workout-session.action";
import type {
  WorkoutItem,
  WorkoutSessionItem,
} from "@/features/workouts/types";

/**
 * The workout while it is happening.
 *
 * Every set write goes straight to the server through the optimistic mutation
 * in useWorkouts, so this sheet holds almost no state of its own: closing it
 * mid-workout loses nothing, and reopening continues exactly where it left off.
 * That is the whole reason a session is a row rather than a component's memory —
 * phones lock, calls come in, and a workout takes an hour.
 *
 * "Завершить" is a separate act from logging the last set. A session with every
 * set ticked is still open until the user says it is done, because the honest
 * moment a workout ends is the one they choose.
 */
export function WorkoutSessionModal({
  workout,
  session,
  previousSession,
  today,
  open,
  onOpenChange,
  onToggleSet,
  onComplete,
  onChanged,
}: {
  workout: WorkoutItem | null;
  session: WorkoutSessionItem | null;
  /** The session before this one, for seeding each set's starting numbers. */
  previousSession: WorkoutSessionItem | null;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSet: (sessionId: string, set: WorkoutSetDraft, isDone: boolean) => void;
  onComplete: (isCompleted: boolean) => void;
  onChanged: () => void;
}) {
  const rawInitData = useRawInitData();
  /**
   * The running rest, plus a nonce.
   *
   * Keying the timer on the duration alone would fail on the ordinary case:
   * two consecutive sets of the same exercise ask for the same 90 seconds, the
   * key would not change, and the second tick would inherit the first set's
   * deadline — a timer that silently does not restart. The nonce makes every
   * logged set a new mount.
   */
  const [rest, setRest] = useState<{ seconds: number; nonce: number } | null>(null);
  const [note, setNote] = useState(session?.note ?? "");
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const saveNote = useMutation({
    mutationFn: setWorkoutSessionNoteAction,
    onSuccess: onChanged,
  });

  const removeSession = useMutation({
    mutationFn: deleteWorkoutSessionAction,
    onSuccess: () => {
      onOpenChange(false);
      onChanged();
    },
  });

  if (!workout || !session) return null;

  // Captured as consts: both are parameter bindings, so the narrowing above
  // does not reach inside the closures below on its own.
  const sessionId = session.id;
  const exercises = activeExercises(workout.exercises);
  const stats = sessionStats(session, workout);
  const isCompleted = session.completedAt !== null;
  const noteChanged = (session.note ?? "") !== note.trim();

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{workout.title}</ModalTitle>
          <p className="text-caption text-muted-foreground">
            {formatDay(session.day, today)}
            {session.day === today && " · сегодня"}
            {isCompleted ? " · выполнена" : " · идёт"}
          </p>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Card elevation="inset" className="rounded-2xl">
            <div className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="numeric text-metric-lg font-bold leading-none tracking-[-0.04em] text-foreground">
                    {stats.setsDone}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {stats.setsPlanned > 0
                      ? `из ${stats.setsPlanned} ${setsWord(stats.setsPlanned)}`
                      : setsWord(stats.setsDone)}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="numeric text-caption font-semibold text-foreground">
                    {formatVolume(stats.volumeKg)}
                  </span>
                  <span className="numeric text-micro text-subtle-foreground">
                    {stats.totalReps} {repsWord(stats.totalReps)}
                  </span>
                </div>
              </div>

              <GoalProgressBar
                ratio={stats.ratio}
                fillClass={progressFillClass(stats.ratio, false)}
                size="sm"
              />
            </div>
          </Card>

          {exercises.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <Dumbbell className="h-4 w-4 text-subtle-foreground" />
              <p className="text-caption text-muted-foreground">
                В этой тренировке нет упражнений
              </p>
              <p className="text-micro text-subtle-foreground">
                Её можно просто отметить выполненной — или добавить упражнения в
                настройках тренировки.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {exercises.map((exercise, index) => (
                <WorkoutExerciseRunner
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  disabled={false}
                  logged={setsOf(session, exercise.id)}
                  previous={previousSession ? setsOf(previousSession, exercise.id) : []}
                  onToggleSet={(set, isDone) => onToggleSet(sessionId, set, isDone)}
                  onRest={(seconds) =>
                    setRest((current) => ({ seconds, nonce: (current?.nonce ?? 0) + 1 }))
                  }
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-note" className="text-caption text-muted-foreground">
              Как прошло — необязательно
            </label>
            <Textarea
              id="session-note"
              value={note}
              maxLength={SESSION_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Самочувствие, техника, что поменять в следующий раз"
            />
            {noteChanged && (
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                disabled={saveNote.isPending}
                onClick={() =>
                  saveNote.mutate({ rawInitData, sessionId, note: note.trim() })
                }
              >
                {saveNote.isPending ? "Сохраняем…" : "Сохранить заметку"}
              </Button>
            )}
          </div>

          {rest !== null && (
            <RestTimer
              key={rest.nonce}
              seconds={rest.seconds}
              onDismiss={() => setRest(null)}
            />
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Button
              className="w-full"
              size="lg"
              variant={isCompleted ? "secondary" : "primary"}
              onClick={() => {
                // «Успех» ровно один раз за сессию — на её закрытии. Возврат в
                // работу успехом не является, поэтому отклик там нейтральный.
                if (isCompleted) haptics.tap();
                else haptics.success();

                onComplete(!isCompleted);
                if (!isCompleted) onOpenChange(false);
              }}
            >
              {isCompleted ? "Вернуть в работу" : "Завершить тренировку"}
            </Button>

            {!isConfirmingDelete && (
              <Button
                variant="ghost"
                className="w-full text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Удалить эту тренировку из истории
              </Button>
            )}

            {isConfirmingDelete && (
              <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive-muted p-3">
                <p className="text-caption text-foreground">
                  Удалить запись за {formatDay(session.day, today)} вместе со всеми
                  подходами? Сама тренировка и её план останутся.
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
                    disabled={removeSession.isPending}
                    onClick={() => removeSession.mutate({ rawInitData, sessionId })}
                  >
                    {removeSession.isPending ? "Удаляем…" : "Удалить"}
                  </Button>
                </div>
              </div>
            )}

            {(saveNote.isError || removeSession.isError) && (
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
