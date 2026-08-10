import { z } from "zod";
import {
  EXERCISES_MAX,
  REPS_MAX,
  REST_MAX,
  SETS_MAX,
  WORKOUT_CATEGORIES,
} from "@/features/workouts/schemas";

/**
 * Программа тренировок как план на неделю, а не как одна тренировка.
 *
 * Существующий Workout — это один тренировочный день со своим расписанием
 * (weekdayMask). Программа состоит из нескольких таких дней, и это ровно то, что
 * человек имеет в виду, когда говорит «дай мне программу на три дня в неделю».
 * Поэтому подбор создаёт не одну запись, а несколько — по одной на день, каждая
 * со своим днём недели, — и дальше они живут как обычные программы: их можно
 * править, архивировать и выполнять теми же экранами, что и созданные руками.
 *
 * Никакой новой сущности в базе для этого не появилось намеренно: «программа» —
 * это набор Workout, а не таблица. Иначе у раздела было бы две модели плана, и
 * половина экранов знала бы только об одной.
 */

export const PROGRAM_GOALS = ["lose", "gain", "fit"] as const;
export type ProgramGoal = (typeof PROGRAM_GOALS)[number];

export const PROGRAM_LEVELS = ["beginner", "intermediate"] as const;
export type ProgramLevel = (typeof PROGRAM_LEVELS)[number];

export const PROGRAM_EQUIPMENT = ["gym", "home", "bodyweight"] as const;
export type ProgramEquipment = (typeof PROGRAM_EQUIPMENT)[number];

export const PROGRAM_GOAL_LABELS: Record<ProgramGoal, string> = {
  lose: "Похудеть",
  gain: "Набрать мышцы",
  fit: "Улучшить форму",
};

export const PROGRAM_LEVEL_LABELS: Record<ProgramLevel, string> = {
  beginner: "Начинающий",
  intermediate: "Есть опыт",
};

export const PROGRAM_LEVEL_HINTS: Record<ProgramLevel, string> = {
  beginner: "Меньше года регулярных тренировок",
  intermediate: "Год и больше, техника знакома",
};

export const PROGRAM_EQUIPMENT_LABELS: Record<ProgramEquipment, string> = {
  gym: "Зал",
  home: "Дом с инвентарём",
  bodyweight: "Только своё тело",
};

export const PROGRAM_EQUIPMENT_HINTS: Record<ProgramEquipment, string> = {
  gym: "Штанга, тренажёры, гантели",
  home: "Гантели или резинки, турник",
  bodyweight: "Ничего не нужно",
};

/** Дни недели, 0 = понедельник — та же конвенция, что у weekdayMask. */
export const PROGRAM_MAX_DAYS = 5;

export const programPlanSchema = z.object({
  /** «Похудение · зал · 3 дня» — заголовок, который увидит человек. */
  name: z.string().trim().min(1).max(80),
  /** Одна-две фразы: логика программы. */
  summary: z.string().trim().min(1).max(400),
  days: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(60),
        category: z.enum(WORKOUT_CATEGORIES),
        /** 0 = понедельник … 6 = воскресенье. */
        weekday: z.number().int().min(0).max(6),
        exercises: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(60),
              targetSets: z.number().int().min(1).max(SETS_MAX),
              targetReps: z.number().int().min(1).max(REPS_MAX),
              restSeconds: z.number().int().min(0).max(REST_MAX),
              note: z
                .string()
                .trim()
                .max(200)
                .transform((value) => (value === "" ? null : value))
                .nullable(),
            }),
          )
          .min(1)
          .max(EXERCISES_MAX),
      }),
    )
    .min(1)
    .max(PROGRAM_MAX_DAYS),
});

export type ProgramPlan = z.infer<typeof programPlanSchema>;

/** То же для Gemini — руками, по той же причине, что и в остальных фичах. */
export const PROGRAM_PLAN_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["name", "summary", "days"],
  properties: {
    name: { type: "string", description: "«Похудение · зал · 3 дня»" },
    summary: { type: "string", description: "Логика программы в одной-двух фразах" },
    days: {
      type: "array",
      minItems: 1,
      maxItems: PROGRAM_MAX_DAYS,
      items: {
        type: "object",
        required: ["title", "category", "weekday", "exercises"],
        properties: {
          title: { type: "string", description: "«День A · всё тело»" },
          category: { type: "string", enum: [...WORKOUT_CATEGORIES] },
          weekday: {
            type: "integer",
            minimum: 0,
            maximum: 6,
            description: "0 = понедельник, 6 = воскресенье",
          },
          exercises: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            items: {
              type: "object",
              required: ["name", "targetSets", "targetReps", "restSeconds", "note"],
              properties: {
                name: { type: "string" },
                targetSets: { type: "integer", minimum: 1, maximum: 10 },
                targetReps: { type: "integer", minimum: 1, maximum: 100 },
                restSeconds: { type: "integer", minimum: 0, maximum: 600 },
                note: { type: ["string", "null"], description: "Подсказка по технике или null" },
              },
            },
          },
        },
      },
    },
  },
};
