import { z } from "zod";

export const GOAL_TITLE_MAX = 120;
export const GOAL_NOTE_MAX = 500;

export const goalTitleSchema = z
  .string()
  .trim()
  .min(1, "Введи название")
  .max(GOAL_TITLE_MAX, "Слишком длинное название");

export const goalStepTitleSchema = z
  .string()
  .trim()
  .min(1, "Введи шаг")
  .max(GOAL_TITLE_MAX, "Слишком длинный шаг");

// An out-of-range component ("2026-02-30") produces an Invalid Date rather
// than silently rolling over, so parsing is the whole check.
function isRealCalendarDate(ymd: string): boolean {
  return !Number.isNaN(Date.parse(`${ymd}T00:00:00.000Z`));
}

/**
 * Accepts what <input type="date"> actually produces: a "YYYY-MM-DD" string,
 * or "" once the user clears the field. Both "" and null normalise to null so
 * the server never has to decide which flavour of empty it received.
 */
export const goalTargetDateSchema = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата")])
  .nullable()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || isRealCalendarDate(value), "Некорректная дата");

export const goalNoteSchema = z
  .string()
  .trim()
  .max(GOAL_NOTE_MAX, "Слишком длинная заметка")
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const goalDraftSchema = z.object({
  title: goalTitleSchema,
  targetDate: goalTargetDateSchema,
  note: goalNoteSchema,
});

/** What the create/edit form collects, before it becomes an action payload. */
export type GoalDraft = z.input<typeof goalDraftSchema>;
