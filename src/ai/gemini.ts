import "server-only";
import { GoogleGenAI, ApiError } from "@google/genai";
import { env } from "@/shared/config/env";

/**
 * The one place the app talks to Gemini.
 *
 * Every AI feature (Coach, food-photo analysis, appearance-photo analysis)
 * calls `generateStructured` below instead of touching `@google/genai`
 * directly — one client, one retry policy, one timeout, one error shape, so a
 * change to any of those is a change in one file rather than three.
 */

// ---------------------------------------------------------------------------
// Config — every tunable in one place, nothing hardcoded at the call site.
// ---------------------------------------------------------------------------

export const GEMINI_CONFIG = {
  model: "gemini-2.5-flash",
  /** Deterministic-leaning: every caller here wants a structured, factual
   *  answer, not creative variation. */
  temperature: 0.4,
  maxOutputTokens: 2048,
  /** Structured extraction/classification has no use for extended reasoning —
   *  it costs latency without changing a JSON-schema-constrained answer. */
  thinkingBudget: 0,
  timeoutMs: 20_000,
  maxRetries: 2,
  /** Base delay for exponential backoff between retries, in ms. */
  retryBaseDelayMs: 500,
} as const;

// ---------------------------------------------------------------------------
// Errors — one typed shape every caller can pattern-match on.
// ---------------------------------------------------------------------------

export type GeminiErrorKind =
  | "not_configured"
  | "rate_limited"
  | "timeout"
  | "invalid_response"
  | "network"
  | "unknown";

/**
 * What every failure mode collapses to before it reaches a server action.
 *
 * `userMessage` is always safe to show as-is — Russian, no stack traces, no
 * provider name — so a caller that has no fallback of its own (food and
 * appearance analysis, unlike Coach) can surface it directly.
 */
export class GeminiError extends Error {
  readonly kind: GeminiErrorKind;
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(kind: GeminiErrorKind, message: string, userMessage: string, retryable: boolean) {
    super(message);
    this.name = "GeminiError";
    this.kind = kind;
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

const USER_MESSAGES: Record<GeminiErrorKind, string> = {
  not_configured: "ИИ временно недоступен. Попробуйте позже.",
  rate_limited: "Сейчас слишком много запросов к ИИ. Подождите немного и попробуйте снова.",
  timeout: "ИИ не ответил вовремя. Попробуйте ещё раз.",
  invalid_response: "Не удалось разобрать ответ ИИ. Попробуйте ещё раз.",
  network: "Не удалось связаться с ИИ. Проверьте соединение и попробуйте снова.",
  unknown: "Что-то пошло не так на стороне ИИ. Попробуйте ещё раз.",
};

function classifyApiError(error: ApiError): GeminiError {
  if (error.status === 429) {
    return new GeminiError(
      "rate_limited",
      `Gemini rate limited (status ${error.status}): ${error.message}`,
      USER_MESSAGES.rate_limited,
      true,
    );
  }
  if (error.status >= 500) {
    return new GeminiError(
      "network",
      `Gemini server error (status ${error.status}): ${error.message}`,
      USER_MESSAGES.network,
      true,
    );
  }
  return new GeminiError(
    "unknown",
    `Gemini API error (status ${error.status}): ${error.message}`,
    USER_MESSAGES.unknown,
    false,
  );
}

function classifyUnknownError(error: unknown): GeminiError {
  if (error instanceof GeminiError) return error;
  if (error instanceof ApiError) return classifyApiError(error);

  if (error instanceof Error && error.name === "AbortError") {
    return new GeminiError(
      "timeout",
      `Gemini call timed out after ${GEMINI_CONFIG.timeoutMs}ms`,
      USER_MESSAGES.timeout,
      true,
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  return new GeminiError("unknown", `Gemini call failed: ${message}`, USER_MESSAGES.unknown, true);
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let cached: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!env.GEMINI_API_KEY) return null;
  cached ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return cached;
}

export function isGeminiEnabled(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GenerateStructuredTurn {
  role: "user" | "model";
  text: string;
}

export interface GenerateStructuredInput {
  /** Static instructions — role, rules, output contract. Cheap to keep
   *  separate from the per-call data even without prompt caching, and it
   *  keeps every prompt's "policy" text in one place per feature. */
  systemInstruction: string;
  /** The per-call text: the facts, the question, whatever varies. */
  prompt: string;
  /** Prior turns of a conversation — only Coach uses this, for follow-up
   *  questions that refer back to what was already said. */
  history?: GenerateStructuredTurn[];
  /** An inline image (food photo, progress photo) for a vision call. */
  image?: { base64Data: string; mimeType: string };
  /** Hand-written JSON Schema — Gemini's `responseJsonSchema` accepts it
   *  directly, the same shape every feature's `*_JSON_SCHEMA` export uses. */
  jsonSchema: Record<string, unknown>;
}

/**
 * One Gemini call, constrained to JSON, with retry/timeout/rate-limit
 * handling baked in.
 *
 * Returns the raw parsed JSON (`unknown`) — every caller runs its own zod
 * schema over it immediately after: the wire format is Gemini's
 * `responseJsonSchema`, the actual guarantee is zod. Throws `GeminiError` on
 * any failure, including
 * "not configured" — callers that have a deterministic fallback (Coach) catch
 * it and fall back; callers that do not (food/appearance analysis) let it
 * surface as an upgrade/retry prompt.
 */
export async function generateStructured(input: GenerateStructuredInput): Promise<unknown> {
  const client = getClient();
  if (!client) {
    throw new GeminiError(
      "not_configured",
      "GEMINI_API_KEY is not configured",
      USER_MESSAGES.not_configured,
      false,
    );
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: input.prompt },
  ];
  if (input.image) {
    parts.push({ inlineData: { data: input.image.base64Data, mimeType: input.image.mimeType } });
  }

  const contents = [
    ...(input.history ?? []).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user" as const, parts },
  ];

  let lastError: GeminiError | null = null;

  for (let attempt = 0; attempt <= GEMINI_CONFIG.maxRetries; attempt += 1) {
    if (attempt > 0) {
      await sleep(GEMINI_CONFIG.retryBaseDelayMs * 2 ** (attempt - 1));
    }

    try {
      const response = await client.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents,
        config: {
          systemInstruction: input.systemInstruction,
          temperature: GEMINI_CONFIG.temperature,
          maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
          thinkingConfig: { thinkingBudget: GEMINI_CONFIG.thinkingBudget },
          responseMimeType: "application/json",
          responseJsonSchema: input.jsonSchema,
          abortSignal: AbortSignal.timeout(GEMINI_CONFIG.timeoutMs),
        },
      });

      const text = response.text;
      if (!text || !text.trim()) {
        throw new GeminiError(
          "invalid_response",
          "Gemini returned an empty response",
          USER_MESSAGES.invalid_response,
          true,
        );
      }

      try {
        return JSON.parse(text) as unknown;
      } catch (parseError) {
        throw new GeminiError(
          "invalid_response",
          `Gemini response was not valid JSON: ${String(parseError)}`,
          USER_MESSAGES.invalid_response,
          true,
        );
      }
    } catch (error) {
      lastError = classifyUnknownError(error);
      console.error(
        `[gemini] attempt ${attempt + 1}/${GEMINI_CONFIG.maxRetries + 1} failed (${lastError.kind}): ${lastError.message}`,
      );
      if (!lastError.retryable) break;
    }
  }

  throw lastError ?? new GeminiError("unknown", "Gemini call failed", USER_MESSAGES.unknown, false);
}
