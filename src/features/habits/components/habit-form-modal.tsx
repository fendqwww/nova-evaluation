"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { HabitSchedulePicker } from "@/features/habits/components/habit-schedule-picker";
import { createHabitAction } from "@/features/habits/server/create-habit.action";
import { updateHabitAction } from "@/features/habits/server/update-habit.action";
import { HABIT_NOTE_MAX, habitTitleSchema } from "@/features/habits/schemas";
import type { HabitItem, HabitSchedule } from "@/features/habits/types";

/**
 * One modal for both creating and editing — the fields are identical, and a
 * second near-copy of this form would be two things to keep in sync. `habit`
 * being null is what makes it a create.
 *
 * State is seeded straight from props, never re-synced by an effect: the parent
 * bumps this component's key on every open, so each opening is a fresh mount
 * showing the row it was opened for.
 */
export function HabitFormModal({
  habit,
  open,
  onOpenChange,
  onSaved,
}: {
  habit: HabitItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const rawInitData = useRawInitData();
  const [title, setTitle] = useState(habit?.title ?? "");
  const [note, setNote] = useState(habit?.note ?? "");
  const [schedule, setSchedule] = useState<HabitSchedule>(
    habit?.schedule ?? { kind: "daily" },
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const draft = { title, note, schedule };
      return habit
        ? updateHabitAction({ rawInitData, habitId: habit.id, draft })
        : createHabitAction({ rawInitData, draft });
    },
    onSuccess: () => {
      onOpenChange(false);
      onSaved();
    },
  });

  const isValid = habitTitleSchema.safeParse(title).success;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{habit ? "Изменить привычку" : "Новая привычка"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: зарядка по утрам"
            aria-label="Название привычки"
          />

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Как часто</span>
            <HabitSchedulePicker schedule={schedule} onChange={setSchedule} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="habit-note" className="text-caption text-muted-foreground">
              Заметка — необязательно
            </label>
            <Textarea
              id="habit-note"
              value={note}
              maxLength={HABIT_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Зачем эта привычка и что считается выполнением"
            />
          </div>

          {habit && (
            <p className="text-caption text-subtle-foreground">
              История отметок сохранится — регулярность пересчитается по новому
              расписанию.
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
              : habit
                ? "Сохранить"
                : "Добавить привычку"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
