"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Dumbbell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { NumberStepper } from "@/features/workouts/components/number-stepper";
import { ExerciseIllustration } from "@/features/workouts/components/exercise-illustration";
import { ExercisePickerModal } from "@/features/workouts/components/exercise-picker-modal";
import type { CatalogExercise } from "@/features/workouts/lib/exercise-catalog";
import { formatRest, formatWeight } from "@/features/workouts/lib/format";
import {
  EXERCISES_MAX,
  EXERCISE_NAME_MAX,
  EXERCISE_NOTE_MAX,
  REPS_MAX,
  REST_MAX,
  SETS_MAX,
  WEIGHT_MAX,
  type WorkoutExerciseDraft,
} from "@/features/workouts/schemas";

/**
 * The plan, built one exercise at a time.
 *
 * Rows are collapsed to a single line by default and expand to the full set of
 * targets. A gym programme is six to ten exercises; showing every field of
 * every one at once turns a form into a spreadsheet, and the line that is
 * actually read at a glance — "Жим лёжа · 4 × 8 · 60 кг" — is the collapsed one.
 *
 * Reordering is by arrows rather than drag: order is part of the plan and does
 * need to be editable, but a drag surface inside an already-scrolling modal on
 * a phone fights the scroll every time. Two 40px targets do not.
 */
export function WorkoutExerciseEditor({
  exercises,
  onChange,
}: {
  exercises: WorkoutExerciseDraft[];
  onChange: (exercises: WorkoutExerciseDraft[]) => void;
}) {
  // Index of the open row, or null when every row is collapsed. One at a time:
  // two expanded rows on a phone means neither is readable.
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function patch(index: number, changes: Partial<WorkoutExerciseDraft>) {
    onChange(exercises.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  /**
   * Добавить строку.
   *
   * Схема подходов берётся из справочника, когда упражнение выбрано в нём, и от
   * предыдущей строки, когда имя вводится руками. Порядок именно такой: у
   * приседа и у махов в стороны разумные схемы разные, и «повторить прошлую
   * строку» — хорошая догадка ровно до тех пор, пока мы не знаем движения. Как
   * только знаем — знание сильнее догадки.
   */
  function add(preset?: CatalogExercise, name = "") {
    const previous = exercises.at(-1);
    onChange([
      ...exercises,
      {
        name: preset?.name ?? name,
        targetSets: preset?.sets ?? previous?.targetSets ?? 3,
        targetReps: preset?.reps ?? previous?.targetReps ?? 10,
        targetWeightKg: null,
        restSeconds: preset?.restSeconds ?? previous?.restSeconds ?? 90,
        note: null,
      },
    ]);
    // Строка из справочника уже заполнена — раскрывать её незачем; строку со
    // своим названием, наоборот, надо дозаполнить, и она открывается сразу.
    setExpanded(preset ? null : exercises.length);
    setPickerOpen(false);
  }

  function remove(index: number) {
    onChange(exercises.filter((_, i) => i !== index));
    setExpanded(null);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= exercises.length) return;
    const next = [...exercises];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setExpanded(target);
  }

  return (
    <div className="flex flex-col gap-2">
      {exercises.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border px-4 py-5 text-center">
          <Dumbbell className="h-4 w-4 text-subtle-foreground" />
          <p className="text-caption text-muted-foreground">Упражнений пока нет</p>
          <p className="text-micro text-subtle-foreground">
            Можно сохранить и без них — тогда тренировка отмечается целиком.
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {exercises.map((exercise, index) => {
          const isOpen = expanded === index;

          return (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <Card elevation="inset" className="overflow-hidden rounded-xl">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : index)}
                  className="flex w-full items-center gap-2.5 p-3 text-left"
                >
                  {/* Схема мышц вместо порядкового номера: номер строки в
                      плане не значит ничего (порядок и так виден сверху вниз),
                      а группа — значит. Пока имени нет, показывать нечего,
                      и на его месте стоит номер. */}
                  {exercise.name.trim() ? (
                    <ExerciseIllustration
                      name={exercise.name}
                      size="sm"
                      className="h-9 w-9 rounded-lg"
                    />
                  ) : (
                    <span className="numeric flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fill-muted text-micro font-semibold text-subtle-foreground">
                      {index + 1}
                    </span>
                  )}

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "truncate text-caption font-semibold",
                        exercise.name.trim() ? "text-foreground" : "text-subtle-foreground",
                      )}
                    >
                      {exercise.name.trim() || "Новое упражнение"}
                    </span>
                    <span className="numeric text-micro text-subtle-foreground">
                      {exercise.targetSets} × {exercise.targetReps}
                      {/* formatWeight, not the raw number: a JS float renders
                          "62.5" with a decimal point, which is not how a weight
                          is written in Russian anywhere else in this section. */}
                      {exercise.targetWeightKg !== null &&
                        ` · ${formatWeight(exercise.targetWeightKg)} кг`}
                      {` · отдых ${formatRest(exercise.restSeconds)}`}
                    </span>
                  </span>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-subtle-foreground transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-3 border-t border-border p-3">
                    <Input
                      value={exercise.name}
                      maxLength={EXERCISE_NAME_MAX}
                      onChange={(event) => patch(index, { name: event.target.value })}
                      placeholder="Например: жим лёжа"
                      aria-label="Название упражнения"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Подходы">
                        <NumberStepper
                          label="Подходы"
                          value={exercise.targetSets}
                          min={1}
                          max={SETS_MAX}
                          onChange={(value) => patch(index, { targetSets: value })}
                        />
                      </Field>
                      <Field label="Повторения">
                        <NumberStepper
                          label="Повторения"
                          value={exercise.targetReps}
                          min={1}
                          max={REPS_MAX}
                          onChange={(value) => patch(index, { targetReps: value })}
                        />
                      </Field>
                    </div>

                    <Field label="Рабочий вес">
                      {exercise.targetWeightKg === null ? (
                        <button
                          type="button"
                          onClick={() => patch(index, { targetWeightKg: 20 })}
                          className="flex h-10 w-full items-center justify-center rounded-xl border border-dashed border-border text-caption font-medium text-muted-foreground transition-colors duration-200 active:border-border-strong"
                        >
                          Свой вес — задать нагрузку
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <NumberStepper
                            className="flex-1"
                            label="Вес"
                            value={exercise.targetWeightKg}
                            step={2.5}
                            min={0}
                            max={WEIGHT_MAX}
                            suffix="кг"
                            onChange={(value) => patch(index, { targetWeightKg: value })}
                          />
                          <button
                            type="button"
                            onClick={() => patch(index, { targetWeightKg: null })}
                            className="shrink-0 text-micro font-medium text-subtle-foreground transition-colors duration-200 active:text-foreground"
                          >
                            Свой вес
                          </button>
                        </div>
                      )}
                    </Field>

                    <Field label={`Отдых · ${formatRest(exercise.restSeconds)}`}>
                      <NumberStepper
                        label="Отдых в секундах"
                        value={exercise.restSeconds}
                        step={15}
                        min={0}
                        max={REST_MAX}
                        suffix="сек"
                        onChange={(value) => patch(index, { restSeconds: value })}
                      />
                    </Field>

                    <Input
                      value={exercise.note ?? ""}
                      maxLength={EXERCISE_NOTE_MAX}
                      onChange={(event) =>
                        patch(index, { note: event.target.value === "" ? null : event.target.value })
                      }
                      placeholder="Техника, ширина хвата, темп — необязательно"
                      aria-label="Заметка к упражнению"
                    />

                    <div className="flex items-center gap-1.5 border-t border-border pt-3">
                      <IconAction
                        label="Выше"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </IconAction>
                      <IconAction
                        label="Ниже"
                        disabled={index === exercises.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </IconAction>

                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-caption font-medium text-destructive transition-colors duration-200 active:bg-destructive-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Убрать
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <Button
        variant="secondary"
        className="w-full"
        disabled={exercises.length >= EXERCISES_MAX}
        onClick={() => setPickerOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Добавить упражнение
      </Button>

      <ExercisePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(preset) => add(preset)}
        onCreateCustom={(name) => add(undefined, name)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-micro text-subtle-foreground">{label}</span>
      {children}
    </div>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 active:bg-fill-muted disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
