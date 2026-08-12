"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { CalendarOff, Clock, ListTodo, Trash2 } from "lucide-react";
import { Modal, ModalContent } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { deleteTaskAction } from "@/features/tasks/server/delete-task.action";
import { TASK_PRIORITY_LABELS } from "@/features/tasks/schemas";
import { taskDueInfo } from "@/features/tasks/lib/format";
import { dueTextClass, priorityChipClass } from "@/features/tasks/lib/tone";
import type { TaskItem } from "@/features/tasks/types";

function SectionLabel({ children }: { children: string }) {
  return <span className="text-label text-subtle-foreground">{children}</span>;
}

/**
 * The task opened up: when it is due, how important it is, what the note says,
 * and the three things you can do to it.
 *
 * Lighter than GoalDetailModal by design — a task has no sub-structure to
 * manage, so the sheet is a summary panel plus actions rather than a workspace.
 */
export function TaskDetailModal({
  task,
  today,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
  onToggleCompleted,
}: {
  task: TaskItem | null;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDeleted: () => void;
  onToggleCompleted: (taskId: string, isCompleted: boolean) => void;
}) {
  const rawInitData = useRawInitData();
  // Reset by remount, not by an effect: the parent bumps this component's key
  // on every open, so reopening can never inherit an already-armed delete.
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const removeTask = useMutation({
    mutationFn: deleteTaskAction,
    onSuccess: () => {
      onOpenChange(false);
      onDeleted();
    },
  });

  if (!task) return null;

  // Captured as consts: `task` is a parameter binding, so the null-narrowing
  // from the guard above does not reach inside the closures below on its own.
  const taskId = task.id;
  const isCompleted = task.isCompleted;
  const due = taskDueInfo(task, today);
  const showSeparateDate = due.date !== null && due.label !== due.date;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 pr-8">
            <IconChip tone="task" size="md">
              <ListTodo className="h-4 w-4" />
            </IconChip>
            <h2
              className={cn(
                "min-w-0 flex-1 text-title font-semibold leading-snug tracking-[-0.02em]",
                isCompleted ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {task.title}
            </h2>
          </div>

          <Card elevation="inset" className="rounded-2xl">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-1.5">
                {due.days === null ? (
                  <CalendarOff className="h-4 w-4 shrink-0 text-subtle-foreground" />
                ) : (
                  <Clock className={cn("h-4 w-4 shrink-0", dueTextClass(due.horizon))} />
                )}
                <span className={cn("text-body font-medium", dueTextClass(due.horizon))}>
                  {due.label}
                </span>
                {showSeparateDate && (
                  <>
                    <span className="text-subtle-foreground" aria-hidden>
                      ·
                    </span>
                    <span className="text-caption text-subtle-foreground">{due.date}</span>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="text-caption text-muted-foreground">Важность</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-1 text-micro font-semibold uppercase tracking-[0.04em]",
                    priorityChipClass(task.priority),
                  )}
                >
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
              </div>

              {isCompleted && task.completedAt && (
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <span className="text-caption text-muted-foreground">Выполнено</span>
                  <span className="text-caption text-foreground">
                    {formatDay(task.completedAt.slice(0, 10), today)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {task.note && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>ЗАМЕТКА</SectionLabel>
              <p className="whitespace-pre-line text-body text-muted-foreground">{task.note}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Button
              className="w-full"
              size="lg"
              variant={isCompleted ? "secondary" : "primary"}
              onClick={() => {
                onOpenChange(false);
                onToggleCompleted(taskId, !isCompleted);
              }}
            >
              {isCompleted ? "Вернуть в работу" : "Выполнить задачу"}
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
                  Удалить задачу? Отменить будет нельзя.
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
                    disabled={removeTask.isPending}
                    onClick={() => removeTask.mutate({ rawInitData, taskId })}
                  >
                    {removeTask.isPending ? "Удаляем…" : "Удалить"}
                  </Button>
                </div>
              </div>
            )}

            {removeTask.isError && (
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
