import { z } from "zod";
import { DAY_PATTERN, isValidDay } from "@/shared/lib/calendar-day";
import type { CareArea, CareTime } from "@/features/appearance/types";

export const ROUTINE_TITLE_MAX = 80;
export const ROUTINE_NOTE_MAX = 400;
export const STEP_TITLE_MAX = 60;
export const STEPS_MAX = 12;
export const GOAL_TITLE_MAX = 80;
export const GOAL_NOTE_MAX = 400;
export const PHOTO_NOTE_MAX = 200;

/** All seven bits set — the mask that means "every day". Same as habits. */
export const EVERY_WEEKDAY_MASK = 0b1111111;

/**
 * Ceilings on the stored image strings, in characters of base64.
 *
 * These are what make a forged payload harmless rather than merely unlikely:
 * without them a client could write a 40 MB row into a SQLite file. The numbers
 * come from what lib/image.ts actually produces at its target dimensions and
 * quality, with roughly 3× headroom for a photo that compresses badly.
 */
export const PHOTO_IMAGE_MAX_CHARS = 900_000;
export const PHOTO_THUMB_MAX_CHARS = 90_000;
export const PHOTO_DIMENSION_MAX = 8000;

export const CARE_AREAS = [
  "skin",
  "hair",
  "teeth",
  "body",
  "beard",
  "nails",
  "custom",
] as const satisfies readonly CareArea[];

export const careAreaSchema = z.enum(CARE_AREAS);

export const CARE_TIMES = ["morning", "evening", "any"] as const satisfies readonly CareTime[];

export const careTimeSchema = z.enum(CARE_TIMES);

/**
 * A day being written to. Validated as a real date, not merely a well-formed
 * one — "2026-02-30" matches the pattern and would otherwise reach the column
 * as March 2nd. Kept local rather than imported from another feature's module,
 * the same call nutrition and workouts each made.
 */
export const calendarDaySchema = z
  .string()
  .regex(DAY_PATTERN, "Некорректная дата")
  .refine(isValidDay, "Некорректная дата");

/**
 * The schedule as the form collects it.
 *
 * A discriminated union, not an object with three optional fields: it makes
 * "weekdays with no days selected" and "weekly, 9 times a week" unrepresentable
 * rather than merely discouraged.
 */
export const careScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({
    kind: z.literal("weekdays"),
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

export const stepTitleSchema = z
  .string()
  .trim()
  .min(1, "Введи название шага")
  .max(STEP_TITLE_MAX, "Слишком длинное название");

/**
 * One checklist line as the form sends it.
 *
 * `id` is present for a step that already exists and absent for a new one, and
 * that distinction is load-bearing: updateRoutine matches on it to *keep* an
 * existing step's row and therefore its history, rather than delete-and-recreate
 * the way a nutrition template's lines are handled. A step's ticks are real
 * days that happened, so renaming "тоник" must not erase them.
 */
export const careStepDraftSchema = z.object({
  id: z.string().min(1).optional(),
  title: stepTitleSchema,
});

export type CareStepDraft = z.infer<typeof careStepDraftSchema>;

export const routineNoteSchema = z
  .string()
  .trim()
  .max(ROUTINE_NOTE_MAX, "Слишком длинная заметка")
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const routineDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Введи название")
    .max(ROUTINE_TITLE_MAX, "Слишком длинное название"),
  note: routineNoteSchema,
  area: careAreaSchema,
  timeOfDay: careTimeSchema,
  schedule: careScheduleSchema,
  steps: z.array(careStepDraftSchema).max(STEPS_MAX, "Слишком много шагов"),
});

export type RoutineDraft = z.input<typeof routineDraftSchema>;

export const goalNoteSchema = z
  .string()
  .trim()
  .max(GOAL_NOTE_MAX, "Слишком длинная заметка")
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const careGoalDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Введи название")
    .max(GOAL_TITLE_MAX, "Слишком длинное название"),
  note: goalNoteSchema,
  area: careAreaSchema,
  targetDate: calendarDaySchema.nullable(),
});

export type CareGoalDraft = z.input<typeof careGoalDraftSchema>;

/**
 * A data: URI holding a JPEG, as lib/image.ts produces it.
 *
 * The prefix is checked rather than assumed: the string is rendered straight
 * into an <img src>, and accepting an arbitrary URI there would let a stored
 * value point anywhere. Restricting it to an inline JPEG keeps the photo a
 * photo.
 */
function imageDataSchema(maxChars: number) {
  return z
    .string()
    .startsWith("data:image/jpeg;base64,", "Неподдерживаемый формат изображения")
    .max(maxChars, "Слишком большое изображение");
}

export const photoDraftSchema = z.object({
  area: careAreaSchema,
  day: calendarDaySchema,
  note: z
    .string()
    .trim()
    .max(PHOTO_NOTE_MAX, "Слишком длинная заметка")
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  imageData: imageDataSchema(PHOTO_IMAGE_MAX_CHARS),
  thumbData: imageDataSchema(PHOTO_THUMB_MAX_CHARS),
  width: z.number().int().min(1).max(PHOTO_DIMENSION_MAX),
  height: z.number().int().min(1).max(PHOTO_DIMENSION_MAX),
});

export type PhotoDraft = z.infer<typeof photoDraftSchema>;

export const AREA_LABELS: Record<CareArea, string> = {
  skin: "Кожа",
  hair: "Волосы",
  teeth: "Зубы",
  body: "Тело",
  beard: "Борода",
  nails: "Ногти",
  custom: "Своё",
};

export const TIME_LABELS: Record<CareTime, string> = {
  morning: "Утро",
  evening: "Вечер",
  any: "Любое время",
};
