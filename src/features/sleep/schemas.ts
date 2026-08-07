import { z } from "zod";
import { DAY_PATTERN, isValidDay } from "@/shared/lib/calendar-day";
import { TIME_PATTERN } from "@/features/sleep/lib/duration";

export const SLEEP_NOTE_MAX = 200;

export const calendarDaySchema = z
  .string()
  .regex(DAY_PATTERN, "Некорректная дата")
  .refine(isValidDay, "Некорректная дата");

export const sleepTimeSchema = z
  .string()
  .regex(TIME_PATTERN, "Введи время в формате ЧЧ:ММ");

export const sleepQualitySchema = z.number().int().min(1, "Оцените ночь").max(5, "Оцените ночь");

export const sleepNoteSchema = z
  .string()
  .trim()
  .max(SLEEP_NOTE_MAX, "Слишком длинная заметка")
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const sleepLogDraftSchema = z.object({
  day: calendarDaySchema,
  bedTime: sleepTimeSchema,
  wakeTime: sleepTimeSchema,
  quality: sleepQualitySchema,
  note: sleepNoteSchema,
});

/** What the log form collects, before it becomes an action payload. */
export type SleepLogDraft = z.input<typeof sleepLogDraftSchema>;
