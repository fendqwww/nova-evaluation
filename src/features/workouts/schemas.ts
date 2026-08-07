import { z } from "zod";
import { DAY_PATTERN, isValidDay } from "@/shared/lib/calendar-day";
import type { WorkoutCategory } from "@/features/workouts/types";

export const WORKOUT_TITLE_MAX = 80;
export const WORKOUT_NOTE_MAX = 400;
export const EXERCISE_NAME_MAX = 60;
export const EXERCISE_NOTE_MAX = 200;
export const SESSION_NOTE_MAX = 400;

/** How many exercises one workout may hold — a plan, not a catalogue. */
export const EXERCISES_MAX = 30;
/** Ceilings that make a forged payload harmless rather than merely unlikely. */
export const SETS_MAX = 20;
export const REPS_MAX = 999;
export const WEIGHT_MAX = 1000;
export const REST_MAX = 600;

/** No plan — the workout is not owed on any particular day. */
export const NO_PLAN_MASK = 0;
/** All seven bits set. Same convention as the habit mask: bit 0 = Monday. */
export const EVERY_DAY_MASK = 0b1111111;

export const WORKOUT_CATEGORIES = [
  "strength",
  "cardio",
  "hiit",
  "mobility",
  "sport",
  "other",
] as const satisfies readonly WorkoutCategory[];

export const workoutCategorySchema = z.enum(WORKOUT_CATEGORIES);

export const workoutTitleSchema = z
  .string()
  .trim()
  .min(1, "Введи название")
  .max(WORKOUT_TITLE_MAX, "Слишком длинное название");

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value))
    .nullable();

export const workoutNoteSchema = optionalText(WORKOUT_NOTE_MAX, "Слишком длинная заметка");
export const exerciseNoteSchema = optionalText(EXERCISE_NOTE_MAX, "Слишком длинная заметка");
export const sessionNoteSchema = optionalText(SESSION_NOTE_MAX, "Слишком длинная заметка");

/**
 * A plan, as a weekday bitmask.
 *
 * Zero is accepted here and rejected on a habit, and that difference is the
 * point: "тренируюсь когда получится" is a real way to train, while a habit due
 * on no day at all is simply broken. Everything downstream treats mask 0 as
 * "owes nothing on any day" rather than as a missing value.
 */
export const workoutPlanSchema = z
  .number()
  .int()
  .min(NO_PLAN_MASK, "Некорректный план")
  .max(EVERY_DAY_MASK, "Некорректный план");

/**
 * One exercise as the form collects it.
 *
 * `id` is present when editing an exercise that already exists and absent when
 * adding one, which is what lets the repository diff the incoming list against
 * the stored one instead of deleting and recreating the whole plan — recreating
 * it would orphan every set ever logged.
 *
 * `targetWeightKg` is nullable rather than defaulted to 0: null is bodyweight
 * or "not prescribed", 0 is an empty bar, and volume maths reads them the same
 * way only by accident.
 */
export const workoutExerciseDraftSchema = z.object({
  id: z.string().min(1).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Введи название упражнения")
    .max(EXERCISE_NAME_MAX, "Слишком длинное название"),
  targetSets: z.number().int().min(1, "Минимум 1 подход").max(SETS_MAX, "Слишком много подходов"),
  targetReps: z.number().int().min(1, "Минимум 1 повторение").max(REPS_MAX, "Слишком много повторений"),
  targetWeightKg: z
    .number()
    .min(0, "Вес не может быть отрицательным")
    .max(WEIGHT_MAX, "Слишком большой вес")
    .nullable(),
  restSeconds: z.number().int().min(0).max(REST_MAX, "Слишком долгий отдых"),
  note: exerciseNoteSchema,
});

export const workoutDraftSchema = z.object({
  title: workoutTitleSchema,
  note: workoutNoteSchema,
  category: workoutCategorySchema,
  weekdayMask: workoutPlanSchema,
  exercises: z.array(workoutExerciseDraftSchema).max(EXERCISES_MAX, "Слишком много упражнений"),
});

/** What the create/edit form collects, before it becomes an action payload. */
export type WorkoutDraft = z.input<typeof workoutDraftSchema>;
export type WorkoutExerciseDraft = z.input<typeof workoutExerciseDraftSchema>;

/** One performed set, as the runner reports it. */
export const workoutSetDraftSchema = z.object({
  exerciseId: z.string().min(1),
  position: z.number().int().min(0).max(SETS_MAX - 1),
  reps: z.number().int().min(1, "Минимум 1 повторение").max(REPS_MAX),
  weightKg: z.number().min(0).max(WEIGHT_MAX),
});

export type WorkoutSetDraft = z.infer<typeof workoutSetDraftSchema>;

/**
 * A day being written to. Validated as a real date, not merely a well-formed
 * one — "2026-02-30" matches the pattern and would otherwise reach the column
 * as March 2nd.
 */
export const calendarDaySchema = z
  .string()
  .regex(DAY_PATTERN, "Некорректная дата")
  .refine(isValidDay, "Некорректная дата");
