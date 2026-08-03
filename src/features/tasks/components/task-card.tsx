"use client";

import { motion } from "framer-motion";
import { CalendarOff, Check, ChevronRight, Clock, FileText } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { TASK_PRIORITY_LABELS } from "@/features/tasks/schemas";
import { taskDueInfo } from "@/features/tasks/lib/format";
import { dueTextClass, priorityChipClass, priorityRailClass } from "@/features/tasks/lib/tone";
import type { TaskItem } from "@/features/tasks/types";

/**
 * A task as one scannable row: importance on the left edge, title, and the due
 * phrase underneath — everything needed to triage without opening anything.
 *
 * Deliberately more compact than GoalCard. A goal is a project worth a block of
 * card; a task list is read a dozen rows at a time, and giving each row the same
 * weight would make twenty tasks unscannable.
 *
 * The checkbox and the body are siblings, never nested: a button inside a button
 * is invalid HTML and the inner one stops receiving taps in some engines.
 */
export function TaskCard({
  task,
  today,
  onToggle,
  onOpen,
}: {
  task: TaskItem;
  today: CalendarDay;
  onToggle: (isCompleted: boolean) => void;
  onOpen: () => void;
}) {
  const due = taskDueInfo(task, today);
  const showPriority = task.priority !== "normal" && !task.isCompleted;

  return (
    <Card
      elevation={task.isCompleted ? "inset" : "raised"}
      className="overflow-hidden transition-colors duration-200"
    >
      <div className="flex items-stretch">
        {/* Importance as a rail rather than a chip: findable while scanning,
            and it costs none of the horizontal space the title needs. */}
        <span
          className={cn("w-[3px] shrink-0", priorityRailClass(task.priority, task.isCompleted))}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 items-start gap-2.5 p-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => onToggle(!task.isCompleted)}
            role="checkbox"
            aria-checked={task.isCompleted}
            aria-label={task.isCompleted ? "Вернуть в работу" : "Выполнить задачу"}
            className={cn(
              "mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
              task.isCompleted
                ? "border-positive bg-positive text-background"
                : "border-border-strong text-transparent active:border-accent",
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </motion.button>

          <button
            type="button"
            onClick={onOpen}
            className="press-sm flex min-w-0 flex-1 flex-col gap-1 text-left"
          >
            <span
              className={cn(
                "text-body font-medium leading-snug",
                task.isCompleted ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {task.title}
            </span>

            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="flex items-center gap-1">
                {due.days === null ? (
                  <CalendarOff className="h-3 w-3 shrink-0 text-subtle-foreground" />
                ) : (
                  <Clock className={cn("h-3 w-3 shrink-0", dueTextClass(due.horizon))} />
                )}
                <span className={cn("text-caption font-medium", dueTextClass(due.horizon))}>
                  {due.label}
                </span>
              </span>

              {showPriority && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.04em]",
                    priorityChipClass(task.priority),
                  )}
                >
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
              )}

              {task.note && (
                <FileText className="h-3 w-3 shrink-0 text-subtle-foreground" aria-label="Есть заметка" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpen}
            aria-label={`Открыть задачу: ${task.title}`}
            className="press-sm mt-0.5 shrink-0 p-0.5"
          >
            <ChevronRight className="h-4 w-4 text-subtle-foreground" />
          </button>
        </div>
      </div>
    </Card>
  );
}
