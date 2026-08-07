import { z } from "zod";
import { DAY_PATTERN, isValidDay } from "@/shared/lib/calendar-day";
import type { TaskPriority } from "@/features/tasks/types";

export const TASK_TITLE_MAX = 140;
export const TASK_NOTE_MAX = 500;

export const TASK_PRIORITIES = ["low", "normal", "high"] as const;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
};

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Введи название")
  .max(TASK_TITLE_MAX, "Слишком длинное название");

/**
 * Accepts what <input type="date"> actually produces: a "YYYY-MM-DD" string,
 * or "" once the user clears the field. Both "" and null normalise to null so
 * the server never has to decide which flavour of empty it received.
 *
 * The refine is what rejects "2026-02-30" — it matches the pattern, and
 * Date.UTC would silently roll it over to March 2nd rather than fail.
 */
export const taskDueDateSchema = z
  .union([z.literal(""), z.string().regex(DAY_PATTERN, "Некорректная дата")])
  .nullable()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || isValidDay(value), "Некорректная дата");

export const taskNoteSchema = z
  .string()
  .trim()
  .max(TASK_NOTE_MAX, "Слишком длинная заметка")
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const taskDraftSchema = z.object({
  title: taskTitleSchema,
  dueDate: taskDueDateSchema,
  note: taskNoteSchema,
  priority: taskPrioritySchema,
});

/** What the create/edit form collects, before it becomes an action payload. */
export type TaskDraft = z.input<typeof taskDraftSchema>;
