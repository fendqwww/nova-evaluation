import { z } from "zod";
import { DAY_PATTERN, isValidDay } from "@/shared/lib/calendar-day";

export const HABIT_TITLE_MAX = 80;
export const HABIT_NOTE_MAX = 400;

/** All seven bits set — the mask that means "every day". */
export const EVERY_WEEKDAY_MASK = 0b1111111;

export const habitTitleSchema = z
  .string()
  .trim()
  .min(1, "Введи название")
  .max(HABIT_TITLE_MAX, "Слишком длинное название");

export const habitNoteSchema = z
  .string()
  .trim()
  .max(HABIT_NOTE_MAX, "Слишком длинная заметка")
  .transform((value) => (value === "" ? null : value))
  .nullable();

/**
 * The schedule as the form collects it and the action receives it.
 *
 * A discriminated union, not an object with three optional fields: it makes
 * "weekdays with no days selected" and "weekly, 9 times a week" unrepresentable
 * rather than merely discouraged, and the action gets its validation for free.
 */
export const habitScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({
    kind: z.literal("weekdays"),
    // At least one day, at most all seven. A mask of 0 would be a habit that
    // is never due, which reads as broken rather than as a valid choice.
    weekdayMask: z
      .number()
      .int()
      .min(1, "Выбери хотя бы один день")
      .max(EVERY_WEEKDAY_MASK, "Некорректные дни"),
  }),
  z.object({
    kind: z.literal("weekly"),
    timesPerWeek: z
      .number()
      .int()
      .min(1, "Минимум 1 раз в неделю")
      .max(7, "Максимум 7 раз в неделю"),
  }),
]);

export const habitDraftSchema = z.object({
  title: habitTitleSchema,
  note: habitNoteSchema,
  schedule: habitScheduleSchema,
});

/** What the create/edit form collects, before it becomes an action payload. */
export type HabitDraft = z.input<typeof habitDraftSchema>;

/**
 * A day being ticked. Validated as a real date, not just a well-formed one —
 * "2026-02-30" matches the pattern and would otherwise reach the column as
 * March 2nd.
 */
export const calendarDaySchema = z
  .string()
  .regex(DAY_PATTERN, "Некорректная дата")
  .refine(isValidDay, "Некорректная дата");
