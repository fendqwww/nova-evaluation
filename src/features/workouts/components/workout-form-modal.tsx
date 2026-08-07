"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { WorkoutPlanPicker } from "@/features/workouts/components/workout-plan-picker";
import { WorkoutExerciseEditor } from "@/features/workouts/components/workout-exercise-editor";
import { WORKOUT_CATEGORY_OPTIONS } from "@/features/workouts/lib/categories";
import { createWorkoutAction } from "@/features/workouts/server/create-workout.action";
import { updateWorkoutAction } from "@/features/workouts/server/update-workout.action";
import {
  NO_PLAN_MASK,
  WORKOUT_NOTE_MAX,
  workoutDraftSchema,
  workoutTitleSchema,
  type WorkoutExerciseDraft,
} from "@/features/workouts/schemas";
import type { WorkoutCategory, WorkoutItem } from "@/features/workouts/types";

/**
 * One modal for both creating and editing — the fields are identical, and a
 * second near-copy of this form would be two things to keep in sync. `workout`
 * being null is what makes it a create.
 *
 * State is seeded straight from props, never re-synced by an effect: the parent
 * bumps this component's key on every open, so each opening is a fresh mount
 * showing the row it was opened for.
 *
 * Archived exercises are deliberately kept out of the editor. They are no
 * longer part of the plan — they only anchor sets that were logged before they
 * were dropped — and putting them back on screen would invite the user to
 * "fix" a row whose only job is to keep history readable.
 */
export function WorkoutFormModal({
  workout,
  open,
  onOpenChange,
  onSaved,
}: {
  workout: WorkoutItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const rawInitData = useRawInitData();

  const [title, setTitle] = useState(workout?.title ?? "");
  const [note, setNote] = useState(workout?.note ?? "");
  const [category, setCategory] = useState<WorkoutCategory>(workout?.category ?? "strength");
  const [weekdayMask, setWeekdayMask] = useState(workout?.weekdayMask ?? NO_PLAN_MASK);
  const [exercises, setExercises] = useState<WorkoutExerciseDraft[]>(
    (workout?.exercises ?? [])
      .filter((exercise) => exercise.archivedAt === null)
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetWeightKg: exercise.targetWeightKg,
        restSeconds: exercise.restSeconds,
        note: exercise.note,
      })),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const draft = { title, note, category, weekdayMask, exercises };
      return workout
        ? updateWorkoutAction({ rawInitData, workoutId: workout.id, draft })
        : createWorkoutAction({ rawInitData, draft });
    },
    onSuccess: () => {
      onOpenChange(false);
      onSaved();
    },
  });

  // The whole draft, not just the title: an exercise left with an empty name is
  // the one invalid state this form can actually reach, and the button has to
  // know about it before the server does.
  const isValid = workoutDraftSchema.safeParse({
    title,
    note,
    category,
    weekdayMask,
    exercises,
  }).success;
  const titleError = !workoutTitleSchema.safeParse(title).success && title.trim() !== "";
  const hasBlankExercise = exercises.some((exercise) => exercise.name.trim() === "");

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{workout ? "Изменить тренировку" : "Новая тренировка"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: верх тела А"
            aria-label="Название тренировки"
          />
          {titleError && (
            <p className="text-caption text-destructive">Слишком длинное название.</p>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Тип</span>
            <div className="grid grid-cols-3 gap-1.5">
              {WORKOUT_CATEGORY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = option.id === category;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setCategory(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-1.5 py-2.5 text-[0.6875rem] font-medium transition-colors duration-200",
                      selected
                        ? "border-accent-border bg-accent-muted text-accent"
                        : "border-border text-subtle-foreground active:border-border-strong",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="max-w-full truncate">{option.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">План на неделю</span>
            <WorkoutPlanPicker weekdayMask={weekdayMask} onChange={setWeekdayMask} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-caption text-muted-foreground">Упражнения</span>
              <span className="numeric text-[0.6875rem] text-subtle-foreground">
                {exercises.length}
              </span>
            </div>
            <WorkoutExerciseEditor exercises={exercises} onChange={setExercises} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="workout-note" className="text-caption text-muted-foreground">
              Заметка — необязательно
            </label>
            <Textarea
              id="workout-note"
              value={note}
              maxLength={WORKOUT_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Разминка, цель блока, на что обратить внимание"
            />
          </div>

          {workout && (
            <p className="text-caption text-subtle-foreground">
              История тренировок сохранится. Убранные упражнения останутся в прошлых
              тренировках — их результаты не пропадут.
            </p>
          )}

          {hasBlankExercise && (
            <p className="text-caption text-warning">
              У одного из упражнений нет названия — заполните или уберите его.
            </p>
          )}

          {mutation.isError && (
            <p className="text-caption text-destructive">
              Не удалось сохранить. Попробуй ещё раз.
            </p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!isValid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Сохраняем…"
              : workout
                ? "Сохранить"
                : "Создать тренировку"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
