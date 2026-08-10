import { z } from "zod";
import { PATH_GOAL_KINDS, PATH_STEP_TARGETS } from "@/features/path/lib/goal-kinds";

export const PATH_TITLE_MAX = 120;
export const PATH_SUMMARY_MAX = 400;
export const PATH_STEP_TITLE_MAX = 120;
export const PATH_STEP_HINT_MAX = 240;
export const PATH_WISH_MAX = 300;

/** Сколько этапов и шагов план может содержать — потолок и для модели, и для формы. */
export const PATH_MAX_STAGES = 4;
export const PATH_MAX_STEPS = 18;

/**
 * Что визард отправляет на сервер.
 *
 * `targetValue` приходит строкой из числового поля и нормализуется здесь же:
 * пустое поле означает «цель без числа», а не ноль. Ноль килограммов — это
 * утверждение, и принимать его за «не указано» значило бы построить план к весу 0.
 */
export const pathDraftSchema = z.object({
  goalKind: z.enum(PATH_GOAL_KINDS),
  targetValue: z
    .union([z.literal(""), z.coerce.number().min(20, "Слишком мало").max(300, "Слишком много")])
    .nullable()
    .transform((value) => (value === "" || value === null ? null : value)),
  /** Свободное уточнение своими словами. Необязательно — см. заголовок goal-kinds.ts. */
  wish: z
    .string()
    .trim()
    .max(PATH_WISH_MAX, "Слишком длинное описание")
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

export type PathDraft = z.input<typeof pathDraftSchema>;

/**
 * Форма плана, которую обязана вернуть модель.
 *
 * Схема — это и есть контракт: всё, что не проходит её, отбрасывается целиком, и
 * приложение строит путь по шаблону. Поэтому здесь нет ни одного необязательного
 * поля, кроме тех, что действительно могут отсутствовать у настоящего шага.
 */
export const pathPlanSchema = z.object({
  title: z.string().trim().min(1).max(PATH_TITLE_MAX),
  summary: z.string().trim().min(1).max(PATH_SUMMARY_MAX),
  horizonDays: z.number().int().min(14).max(365),
  stages: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(PATH_TITLE_MAX),
        goal: z.string().trim().min(1).max(PATH_SUMMARY_MAX),
        steps: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(PATH_STEP_TITLE_MAX),
              hint: z
                .string()
                .trim()
                .max(PATH_STEP_HINT_MAX)
                .transform((value) => (value === "" ? null : value))
                .nullable(),
              target: z.enum(PATH_STEP_TARGETS).nullable(),
            }),
          )
          .min(1)
          .max(8),
      }),
    )
    .min(2)
    .max(PATH_MAX_STAGES),
});

export type PathPlan = z.infer<typeof pathPlanSchema>;

/**
 * То же самое для Gemini, руками.
 *
 * `responseJsonSchema` принимает обычный JSON Schema, и он написан отдельно от
 * zod по той же причине, что и в остальных AI-фичах: на проводе — схема Gemini,
 * гарантия — zod, и смешивать их значит потерять вторую.
 */
export const PATH_PLAN_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["title", "summary", "horizonDays", "stages"],
  properties: {
    title: { type: "string", description: "Цель одной строкой: «Похудеть на 8 кг»" },
    summary: {
      type: "string",
      description: "Одна-две фразы: почему план именно такой, со ссылкой на данные человека",
    },
    horizonDays: { type: "integer", minimum: 14, maximum: 365 },
    stages: {
      type: "array",
      minItems: 2,
      maxItems: PATH_MAX_STAGES,
      items: {
        type: "object",
        required: ["title", "goal", "steps"],
        properties: {
          title: { type: "string", description: "«Создание базы»" },
          goal: { type: "string", description: "Чего человек достигает к концу этапа" },
          steps: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "object",
              required: ["title", "hint", "target"],
              properties: {
                title: { type: "string", description: "Действие: «Белок 140 г каждый день»" },
                hint: {
                  type: ["string", "null"],
                  description: "Как это сделать, если название недостаточно. null, если достаточно",
                },
                target: {
                  type: ["string", "null"],
                  enum: [...PATH_STEP_TARGETS, null],
                  description: "Раздел приложения, где шаг выполняется",
                },
              },
            },
          },
        },
      },
    },
  },
};
