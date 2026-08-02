"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { createGoalAction } from "@/features/goals/server/create-goal.action";
import { updateGoalAction } from "@/features/goals/server/update-goal.action";
import { GOAL_NOTE_MAX, goalTitleSchema } from "@/features/goals/schemas";
import { toDateInputValue } from "@/features/goals/lib/format";
import type { GoalItem } from "@/features/goals/types";

/**
 * One modal for both creating and editing — the fields are identical, and a
 * second near-copy of this form would be two things to keep in sync. `goal`
 * being null is what makes it a create.
 *
 * State is seeded straight from props, never re-synced by an effect: the parent
 * bumps this component's key on every open, so each opening is a fresh mount
 * showing the row it was opened for.
 */
export function GoalFormModal({
  goal,
  open,
  onOpenChange,
  onSaved,
}: {
  goal: GoalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const rawInitData = useRawInitData();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [targetDate, setTargetDate] = useState(
    toDateInputValue(goal?.targetDate ?? null),
  );
  const [note, setNote] = useState(goal?.note ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const draft = { title, targetDate, note };
      return goal
        ? updateGoalAction({ rawInitData, goalId: goal.id, draft })
        : createGoalAction({ rawInitData, draft });
    },
    onSuccess: () => {
      onOpenChange(false);
      onSaved();
    },
  });

  const isValid = goalTitleSchema.safeParse(title).success;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{goal ? "Изменить цель" : "Новая цель"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: пробежать 10 км"
            aria-label="Название цели"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="goal-target-date" className="text-caption text-muted-foreground">
              Срок — необязательно
            </label>
            <Input
              id="goal-target-date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="goal-note" className="text-caption text-muted-foreground">
              Заметка — необязательно
            </label>
            <Textarea
              id="goal-note"
              value={note}
              maxLength={GOAL_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Зачем эта цель и что считается результатом"
            />
          </div>

          {mutation.isError && (
            <p className="text-caption text-destructive">
              Не удалось сохранить. Попробуйте ещё раз.
            </p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!isValid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Сохраняем..." : goal ? "Сохранить" : "Добавить цель"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
