import { z } from "zod";
import { COACH_INTENT_IDS } from "@/features/coach/lib/intents";

export const COACH_QUESTION_MAX = 400;

/** How many turns the chat loads up front, and per "показать раньше" page. */
export const COACH_HISTORY_PAGE = 20;

export const coachQuestionSchema = z
  .string()
  .trim()
  .min(1, "Введите вопрос")
  .max(COACH_QUESTION_MAX, "Слишком длинный вопрос");

export const coachIntentSchema = z.enum(COACH_INTENT_IDS);

export const coachRoleSchema = z.enum(["user", "coach"]);

export const coachBulletToneSchema = z.enum([
  "positive",
  "warning",
  "critical",
  "neutral",
]);

export const coachActionTargetSchema = z.enum([
  "goals",
  "habits",
  "tasks",
  "workouts",
  "nutrition",
]);

/**
 * The one shape both producers must hit.
 *
 * It validates two different things, and that is deliberate: a payload read
 * back out of CoachMessage, and a fresh answer coming out of the Claude call.
 * Using the same schema for both means a model response that drifts from the
 * contract is rejected at exactly the same boundary as a stored row written by
 * an older version — and in both cases the caller falls back rather than
 * rendering something half-formed.
 */
export const coachAnswerSchema = z.object({
  headline: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(700),
  bullets: z
    .array(
      z.object({
        id: z.string().min(1),
        tone: coachBulletToneSchema,
        text: z.string().trim().min(1).max(240),
      }),
    )
    .max(6),
  actions: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().trim().min(1).max(60),
        target: coachActionTargetSchema.nullable(),
      }),
    )
    .max(4),
});

export const askCoachInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  question: coachQuestionSchema,
  /**
   * Set when the question came from a quick-action chip. It is a hint, not a
   * trust boundary — a forged value can only change which of the user's own
   * facts get emphasised, never which user's facts are read.
   */
  intent: coachIntentSchema.nullable().default(null),
});

export const getCoachHistoryInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  /** Load the page ending just before this message id. */
  beforeId: z.string().min(1),
});

/**
 * The JSON Schema handed to Claude's structured outputs.
 *
 * Hand-written rather than derived from `coachAnswerSchema`: structured outputs
 * reject most of what zod emits (`minLength`, `maxLength`, numeric bounds), so
 * a converter would either silently drop them or produce a schema the API
 * refuses. The zod schema still runs on the response — the two agree on shape,
 * and zod is the one that enforces the limits.
 */
export const COACH_ANSWER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "body", "bullets", "actions"],
  properties: {
    headline: {
      type: "string",
      description: "Одна короткая строка — главный вывод. До 120 символов.",
    },
    body: {
      type: "string",
      description: "Одно-три предложения с объяснением, на данных пользователя.",
    },
    bullets: {
      type: "array",
      description: "До шести конкретных фактов из данных пользователя.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "tone", "text"],
        properties: {
          id: { type: "string", description: "Короткий kebab-case идентификатор." },
          tone: {
            type: "string",
            enum: ["positive", "warning", "critical", "neutral"],
          },
          text: { type: "string" },
        },
      },
    },
    actions: {
      type: "array",
      description: "До четырёх следующих шагов.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "target"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          target: {
            anyOf: [
              { type: "string", enum: ["goals", "habits", "tasks", "workouts", "nutrition"] },
              { type: "null" },
            ],
          },
        },
      },
    },
  },
} as const;
