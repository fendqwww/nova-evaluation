import { z } from "zod";
import { COACH_INTENT_IDS } from "@/features/coach/lib/intents";

export const COACH_QUESTION_MAX = 400;

/** How many turns the chat loads up front, and per "показать раньше" page. */
export const COACH_HISTORY_PAGE = 20;

export const coachQuestionSchema = z
  .string()
  .trim()
  .min(1, "Введи вопрос")
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
  "sleep",
  "appearance",
]);

/**
 * The one shape both producers must hit.
 *
 * It validates two different things, and that is deliberate: a payload read
 * back out of CoachMessage, and a fresh answer coming out of the Gemini call.
 * Using the same schema for both means a model response that drifts from the
 * contract is rejected at exactly the same boundary as a stored row written by
 * an older version — and in both cases the caller falls back rather than
 * rendering something half-formed.
 */
export const coachAnswerSchema = z.object({
  headline: z.string().trim().min(1).max(120),
  // Room for a real explanation — what happened, why, and what it leads to —
  // rather than the single verdict sentence the earlier ceiling allowed. Still
  // a bound, because a card is not an essay.
  body: z.string().trim().min(1).max(900),
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

// ---------------------------------------------------------------------------
// Long-term memory
// ---------------------------------------------------------------------------

/**
 * What kind of thing the Coach learned.
 *
 * Deliberately five buckets and not a free-form label: the kind decides how a
 * fact may be used later — a `dislike` is a constraint on what may be
 * suggested, a `goal` is context for why something matters — and a model
 * inventing its own categories would make that impossible to enforce.
 */
export const COACH_MEMORY_KINDS = [
  "preference",
  "dislike",
  "goal",
  "constraint",
  "context",
] as const;

export const coachMemoryKindSchema = z.enum(COACH_MEMORY_KINDS);

/** How many facts one answer may add, and how many the Coach carries at once. */
export const COACH_MEMORY_PER_TURN = 3;
export const COACH_MEMORY_CAP = 40;

export const coachMemorySchema = z.object({
  /** kebab-case, stable: reusing a key updates that fact instead of duplicating it. */
  key: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "ключ памяти — kebab-case"),
  kind: coachMemoryKindSchema,
  value: z.string().trim().min(3).max(200),
});

/**
 * The memory side channel of a model response, validated item by item.
 *
 * Deliberately *not* folded into coachAnswerSchema as one object schema. The
 * two halves of a response have very different stakes: a malformed answer is
 * worthless and must be rejected, while a malformed memory entry is one fact
 * not learned. Validating them together would let a stray uppercase letter in
 * a memory key throw away a perfectly good analysis the user is waiting on —
 * so the answer is parsed on its own (see ai/coach.ts) and each fact here is
 * kept or dropped independently.
 */
export const coachMemoryListSchema = z.array(z.unknown()).catch([]);

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
 * The JSON Schema handed to Gemini's structured outputs.
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
  required: ["headline", "body", "bullets", "actions", "memory"],
  properties: {
    headline: {
      type: "string",
      description: "Одна короткая строка — главный вывод. До 120 символов, без точки в конце.",
    },
    body: {
      type: "string",
      description:
        "Два-четыре предложения: что происходит, почему так, к чему это ведёт. Только на числах из user_data.",
    },
    bullets: {
      type: "array",
      description:
        "Три-пять конкретных фактов из данных пользователя, каждый с числом. Не лозунги.",
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
      description:
        "Один-три следующих шага, самый важный первым. Каждый — конкретное действие, а не тема.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "target"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          target: {
            anyOf: [
              {
                type: "string",
                enum: ["goals", "habits", "tasks", "workouts", "nutrition", "sleep", "appearance"],
              },
              { type: "null" },
            ],
          },
        },
      },
    },
    memory: {
      type: "array",
      description:
        "Факты о пользователе, которые стоит помнить в следующих разговорах: предпочтения, нелюбимое, ограничения, личные цели. Только то, что пользователь сказал сам в этом разговоре. Пустой массив, если ничего нового не прозвучало.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "kind", "value"],
        properties: {
          key: {
            type: "string",
            description:
              "Стабильный kebab-case идентификатор факта, например dislikes-running. Тот же ключ обновляет уже известный факт.",
          },
          kind: {
            type: "string",
            enum: ["preference", "dislike", "goal", "constraint", "context"],
          },
          value: {
            type: "string",
            description: "Один факт одним предложением, словами пользователя.",
          },
        },
      },
    },
  },
} as const;
