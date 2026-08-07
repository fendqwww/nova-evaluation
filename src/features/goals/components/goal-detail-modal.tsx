"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { CalendarOff, Check, Clock, Plus, Target, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Modal, ModalContent } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { GoalProgressBar } from "@/features/goals/components/goal-progress-bar";
import { GoalStatusBadge } from "@/features/goals/components/goal-status-badge";
import { createGoalStepAction } from "@/features/goals/server/create-goal-step.action";
import { deleteGoalStepAction } from "@/features/goals/server/delete-goal-step.action";
import { deleteGoalAction } from "@/features/goals/server/delete-goal.action";
import { goalStepTitleSchema } from "@/features/goals/schemas";
import { countdownTextClass, progressFillClass } from "@/features/goals/lib/tone";
import {
  deadlineInfo,
  formatRemainingSteps,
  formatStepCount,
  goalProgress,
  goalStatus,
} from "@/features/goals/lib/format";
import type { GoalItem } from "@/features/goals/types";

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

/**
 * The goal opened up: one cohesive sheet, not a stack of small panels. The hero
 * panel carries everything quantitative (percentage, steps, deadline, status) so
 * the state of the project is one glance; the sections below it are the things
 * you came here to change.
 */
export function GoalDetailModal({
  goal,
  open,
  onOpenChange,
  onEdit,
  onChanged,
  onDeleted,
  onStepToggle,
  onToggleCompleted,
}: {
  goal: GoalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onChanged: () => void;
  onDeleted: () => void;
  onStepToggle: (stepId: string, isDone: boolean) => void;
  onToggleCompleted: (goalId: string, isCompleted: boolean) => void;
}) {
  const rawInitData = useRawInitData();
  // Both reset by remount, not by an effect: the parent bumps this component's
  // key on every open, so reopening can never inherit a half-typed step or an
  // already-armed delete button.
  const [stepTitle, setStepTitle] = useState("");
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const addStep = useMutation({
    mutationFn: createGoalStepAction,
    onSuccess: () => {
      setStepTitle("");
      onChanged();
    },
  });

  const removeStep = useMutation({
    mutationFn: deleteGoalStepAction,
    onSuccess: onChanged,
  });

  const removeGoal = useMutation({
    mutationFn: deleteGoalAction,
    onSuccess: () => {
      onOpenChange(false);
      onDeleted();
    },
  });

  if (!goal) return null;

  const progress = goalProgress(goal);
  const status = goalStatus(goal);
  const deadline = deadlineInfo(goal);
  const isStepValid = goalStepTitleSchema.safeParse(stepTitle).success;
  const showSeparateDate = deadline.date !== null && deadline.countdown !== deadline.date;

  // Captured as a const: `goal` is a parameter binding, so the null-narrowing
  // from the guard above does not reach inside the closures below on its own.
  const goalId = goal.id;
  const isCompleted = goal.isCompleted;

  function submitStep() {
    if (!isStepValid) return;
    addStep.mutate({ rawInitData, goalId, title: stepTitle.trim() });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 pr-8">
            <IconChip tone="goal" size="md">
              <Target className="h-4 w-4" />
            </IconChip>
            {/* Badge lives in the hero panel below, beside the percentage —
                same reasoning as GoalCard: next to the title it cost the title
                a second line. */}
            <h2
              className={cn(
                "min-w-0 flex-1 text-[1.125rem] font-semibold leading-snug tracking-[-0.02em]",
                isCompleted ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {goal.title}
            </h2>
          </div>

          <Card elevation="inset" className="rounded-2xl">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "numeric text-[2.5rem] font-bold leading-none tracking-[-0.045em]",
                      isCompleted ? "text-positive" : "text-foreground",
                    )}
                  >
                    {progress.percent}%
                  </span>
                  <GoalStatusBadge status={status} />
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {progress.hasSteps ? (
                    <>
                      <span className="numeric text-caption font-semibold text-foreground">
                        {formatStepCount(progress.done, progress.total)}
                      </span>
                      <span className="numeric text-[0.75rem] text-subtle-foreground">
                        {progress.remaining > 0
                          ? formatRemainingSteps(progress.remaining)
                          : "все шаги закрыты"}
                      </span>
                    </>
                  ) : (
                    <span className="text-[0.75rem] text-subtle-foreground">
                      шаги не заданы
                    </span>
                  )}
                </div>
              </div>

              <GoalProgressBar
                ratio={progress.ratio}
                fillClass={progressFillClass(isCompleted, deadline.tone)}
              />

              <div className="flex items-center gap-1.5 border-t border-white/6 pt-3">
                {deadline.days === null ? (
                  <CalendarOff className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                ) : (
                  <Clock
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      countdownTextClass(deadline.tone),
                    )}
                  />
                )}
                <span
                  className={cn(
                    "text-caption font-medium",
                    countdownTextClass(deadline.tone),
                  )}
                >
                  {deadline.countdown}
                </span>
                {showSeparateDate && (
                  <>
                    <span className="text-subtle-foreground" aria-hidden>
                      ·
                    </span>
                    <span className="text-caption text-subtle-foreground">
                      {deadline.date}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Card>

          {goal.note && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>ОПИСАНИЕ</SectionLabel>
              <p className="whitespace-pre-line text-body text-muted-foreground">
                {goal.note}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <SectionLabel
              trailing={
                progress.hasSteps
                  ? `${progress.done} / ${progress.total}`
                  : undefined
              }
            >
              ШАГИ
            </SectionLabel>

            {!progress.hasSteps && (
              <p className="text-caption text-subtle-foreground">
                Разбейте цель на шаги — прогресс считается по ним.
              </p>
            )}

            {goal.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => onStepToggle(step.id, !step.isDone)}
                  role="checkbox"
                  aria-checked={step.isDone}
                  aria-label={step.isDone ? "Снять отметку" : "Отметить шаг"}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
                    step.isDone
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border-strong text-transparent active:border-accent",
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </motion.button>

                <span
                  className={cn(
                    "min-w-0 flex-1 text-body transition-colors duration-200",
                    step.isDone
                      ? "text-subtle-foreground line-through"
                      : "text-foreground",
                  )}
                >
                  {step.title}
                </span>

                <button
                  type="button"
                  onClick={() => removeStep.mutate({ rawInitData, stepId: step.id })}
                  aria-label={`Удалить шаг: ${step.title}`}
                  className="shrink-0 rounded-md p-1.5 text-subtle-foreground transition-colors duration-200 active:bg-white/6 active:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <div className="mt-1 flex items-center gap-2">
              <Input
                value={stepTitle}
                onChange={(event) => setStepTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitStep();
                }}
                placeholder="Добавить шаг"
                aria-label="Новый шаг"
                className="h-10"
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label="Добавить шаг"
                disabled={!isStepValid || addStep.isPending}
                onClick={submitStep}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {(addStep.isError || removeStep.isError) && (
              <p className="text-caption text-destructive">
                Не удалось обновить шаги. Попробуй ещё раз.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Button
              className="w-full"
              size="lg"
              variant={isCompleted ? "secondary" : "primary"}
              onClick={() => {
                onOpenChange(false);
                onToggleCompleted(goalId, !isCompleted);
              }}
            >
              {isCompleted ? "Вернуть в работу" : "Выполнить цель"}
            </Button>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onEdit}>
                Изменить
              </Button>
              {!isConfirmingDelete && (
                <Button
                  variant="ghost"
                  className="flex-1 text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </Button>
              )}
            </div>

            {isConfirmingDelete && (
              <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive-muted p-3">
                <p className="text-caption text-foreground">
                  Удалить цель вместе с шагами? Отменить будет нельзя.
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
                    disabled={removeGoal.isPending}
                    onClick={() => removeGoal.mutate({ rawInitData, goalId })}
                  >
                    {removeGoal.isPending ? "Удаляем…" : "Удалить"}
                  </Button>
                </div>
              </div>
            )}

            {removeGoal.isError && (
              <p className="text-caption text-destructive">
                Не удалось удалить. Попробуй ещё раз.
              </p>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
