"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { NumberStepper } from "@/features/workouts/components/number-stepper";
import {
  REPS_MAX,
  SETS_MAX,
  WEIGHT_MAX,
  type WorkoutSetDraft,
} from "@/features/workouts/schemas";
import { formatLoad, formatRest, formatTarget } from "@/features/workouts/lib/format";
import type { WorkoutExerciseItem, WorkoutSetItem } from "@/features/workouts/types";

/**
 * One exercise, mid-workout.
 *
 * The row a user actually taps is the tick. Everything else — the numbers, the
 * stepper pair that appears when they need changing — is arranged so the common
 * case (you did exactly what the plan said) is one tap, and the ordinary case
 * (you did one rep fewer) is two.
 *
 * A set's starting numbers come from the last time this exercise was performed,
 * not from the plan, whenever there is a last time. A programme written in
 * January is a starting point; what you lifted on Monday is what you are about
 * to lift again. Falling back to the plan keeps the very first session honest.
 *
 * Sets past the planned count are allowed: an extra set is a normal thing to
 * do, and a logger that refuses to record it teaches people to stop logging.
 */
export function WorkoutExerciseRunner({
  exercise,
  logged,
  previous,
  index,
  disabled,
  onToggleSet,
  onRest,
}: {
  exercise: WorkoutExerciseItem;
  /** Sets already logged for this exercise in this session, by position. */
  logged: WorkoutSetItem[];
  /** The same exercise's sets from the previous session, by position. */
  previous: WorkoutSetItem[];
  index: number;
  disabled: boolean;
  onToggleSet: (set: WorkoutSetDraft, isDone: boolean) => void;
  onRest: (seconds: number) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  /** Local edits for sets that are not logged yet — the tick reads these. */
  const [drafts, setDrafts] = useState<Record<number, { reps: number; weightKg: number }>>({});

  const loggedByPosition = new Map(logged.map((set) => [set.position, set]));
  const previousByPosition = new Map(previous.map((set) => [set.position, set]));

  // The plan's sets, plus any extra ones already logged beyond it.
  const highestLogged = logged.reduce((top, set) => Math.max(top, set.position), -1);
  const rowCount = Math.max(exercise.targetSets, highestLogged + 1);
  const positions = Array.from({ length: rowCount }, (_, position) => position);

  function valuesFor(position: number): { reps: number; weightKg: number } {
    const done = loggedByPosition.get(position);
    if (done) return { reps: done.reps, weightKg: done.weightKg };

    const draft = drafts[position];
    if (draft) return draft;

    const before = previousByPosition.get(position) ?? previous.at(-1);
    if (before) return { reps: before.reps, weightKg: before.weightKg };

    return { reps: exercise.targetReps, weightKg: exercise.targetWeightKg ?? 0 };
  }

  function patch(position: number, changes: Partial<{ reps: number; weightKg: number }>) {
    const current = valuesFor(position);
    const next = { ...current, ...changes };
    setDrafts((state) => ({ ...state, [position]: next }));

    // Editing a set that is already logged rewrites it immediately: the row is
    // showing what is in the database, so it has to keep saying the truth.
    if (loggedByPosition.has(position)) {
      onToggleSet({ exerciseId: exercise.id, position, ...next }, true);
    }
  }

  function toggle(position: number) {
    const isDone = loggedByPosition.has(position);
    const values = valuesFor(position);
    onToggleSet({ exerciseId: exercise.id, position, ...values }, !isDone);

    if (!isDone && exercise.restSeconds > 0) onRest(exercise.restSeconds);
    setEditing(null);
  }

  const doneCount = logged.length;
  const isComplete = doneCount >= exercise.targetSets;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "numeric mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-semibold transition-colors duration-200",
            isComplete ? "bg-positive-muted text-positive" : "bg-white/6 text-subtle-foreground",
          )}
        >
          {index + 1}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-caption font-semibold text-foreground">{exercise.name}</span>
          <span className="numeric text-[0.6875rem] text-subtle-foreground">
            План {formatTarget(exercise.targetSets, exercise.targetReps)} ·{" "}
            {formatLoad(exercise.targetWeightKg)}
            {exercise.restSeconds > 0 && ` · отдых ${formatRest(exercise.restSeconds)}`}
          </span>
          {exercise.note && (
            <span className="text-[0.6875rem] text-muted-foreground">{exercise.note}</span>
          )}
        </div>

        <span
          className={cn(
            "numeric shrink-0 text-[0.6875rem] font-semibold",
            isComplete ? "text-positive" : "text-subtle-foreground",
          )}
        >
          {doneCount}/{exercise.targetSets}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 pl-8.5">
        {positions.map((position) => {
          const isDone = loggedByPosition.has(position);
          const values = valuesFor(position);
          const isEditing = editing === position;
          const isExtra = position >= exercise.targetSets;

          return (
            <div key={position} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="numeric w-5 shrink-0 text-[0.6875rem] text-subtle-foreground">
                  {position + 1}
                  {isExtra && <span className="text-accent">+</span>}
                </span>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setEditing(isEditing ? null : position)}
                  className={cn(
                    "numeric flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg border px-3 text-left text-caption transition-colors duration-200 disabled:opacity-50",
                    isEditing
                      ? "border-accent-border bg-accent-soft text-foreground"
                      : isDone
                        ? "border-white/6 bg-white/[0.03] text-muted-foreground"
                        : "border-border text-foreground active:border-border-strong",
                  )}
                >
                  <span className="font-semibold">{values.reps}</span>
                  <span className="text-subtle-foreground">повт.</span>
                  {values.weightKg > 0 && (
                    <>
                      <span className="text-subtle-foreground">·</span>
                      <span className="font-semibold">
                        {String(values.weightKg).replace(".", ",")}
                      </span>
                      <span className="text-subtle-foreground">кг</span>
                    </>
                  )}
                </button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  disabled={disabled}
                  onClick={() => toggle(position)}
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={isDone ? `Отменить подход ${position + 1}` : `Записать подход ${position + 1}`}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 disabled:opacity-50",
                    isDone
                      ? "border-positive bg-positive text-background"
                      : "border-border-strong text-subtle-foreground active:border-accent active:text-accent",
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </motion.button>
              </div>

              {isEditing && (
                <div className="grid grid-cols-2 gap-1.5 pl-6.5">
                  <NumberStepper
                    label="Повторения"
                    value={values.reps}
                    min={1}
                    max={REPS_MAX}
                    onChange={(reps) => patch(position, { reps })}
                  />
                  <NumberStepper
                    label="Вес"
                    value={values.weightKg}
                    step={2.5}
                    min={0}
                    max={WEIGHT_MAX}
                    suffix="кг"
                    onChange={(weightKg) => patch(position, { weightKg })}
                  />
                </div>
              )}
            </div>
          );
        })}

        {rowCount < SETS_MAX && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const position = rowCount;
              setDrafts((state) => ({ ...state, [position]: valuesFor(rowCount - 1) }));
              setEditing(position);
            }}
            className="flex items-center gap-1.5 self-start rounded-lg px-1 py-1 text-[0.6875rem] font-medium text-subtle-foreground transition-colors duration-200 active:text-foreground disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Ещё подход
          </button>
        )}
      </div>
    </div>
  );
}
