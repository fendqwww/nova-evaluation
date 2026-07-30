"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { addDays, type CalendarDay } from "@/shared/lib/calendar-day";
import { createTaskAction } from "@/features/tasks/server/create-task.action";
import { updateTaskAction } from "@/features/tasks/server/update-task.action";
import {
  TASK_NOTE_MAX,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  taskTitleSchema,
} from "@/features/tasks/schemas";
import type { TaskItem, TaskPriority } from "@/features/tasks/types";

/**
 * One modal for both creating and editing — the fields are identical, and a
 * second near-copy of this form would be two things to keep in sync. `task`
 * being null is what makes it a create.
 *
 * State is seeded straight from props, never re-synced by an effect: the parent
 * bumps this component's key on every open, so each opening is a fresh mount
 * showing the row it was opened for.
 */
export function TaskFormModal({
  task,
  today,
  open,
  onOpenChange,
  onSaved,
}: {
  task: TaskItem | null;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const rawInitData = useRawInitData();
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [note, setNote] = useState(task?.note ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal");

  const mutation = useMutation({
    mutationFn: async () => {
      const draft = { title, dueDate, note, priority };
      return task
        ? updateTaskAction({ rawInitData, taskId: task.id, draft })
        : createTaskAction({ rawInitData, draft });
    },
    onSuccess: () => {
      onOpenChange(false);
      onSaved();
    },
  });

  const isValid = taskTitleSchema.safeParse(title).success;

  // The three dates people actually pick, one tap instead of a date-picker
  // round trip. The field below stays the escape hatch for everything else.
  const quickDates: { label: string; value: CalendarDay }[] = [
    { label: "Сегодня", value: today },
    { label: "Завтра", value: addDays(today, 1) },
    { label: "Через неделю", value: addDays(today, 7) },
  ];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{task ? "Изменить задачу" : "Новая задача"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: подготовить отчёт"
            aria-label="Название задачи"
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="task-due-date" className="text-caption text-muted-foreground">
              Срок — необязательно
            </label>

            <div className="flex flex-wrap gap-1.5">
              {quickDates.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() =>
                    setDueDate((current) => (current === option.value ? "" : option.value))
                  }
                  aria-pressed={dueDate === option.value}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-caption font-medium transition-colors duration-200",
                    dueDate === option.value
                      ? "border-accent-border bg-accent-muted text-accent"
                      : "border-border text-muted-foreground active:border-border-strong",
                  )}
                >
                  {option.label}
                </button>
              ))}
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-caption font-medium text-subtle-foreground transition-colors duration-200 active:border-border-strong"
                >
                  Без срока
                </button>
              )}
            </div>

            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Важность</span>
            <div className="flex gap-1.5">
              {TASK_PRIORITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  aria-pressed={value === priority}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-caption font-medium transition-colors duration-200",
                    value === priority
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground active:border-border-strong",
                  )}
                >
                  {TASK_PRIORITY_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-note" className="text-caption text-muted-foreground">
              Заметка — необязательно
            </label>
            <Textarea
              id="task-note"
              value={note}
              maxLength={TASK_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Детали, ссылки, что считается результатом"
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
            {mutation.isPending ? "Сохраняем..." : task ? "Сохранить" : "Добавить задачу"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
