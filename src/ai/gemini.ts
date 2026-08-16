import "server-only";
import { GoogleGenAI, ApiError, ThinkingLevel } from "@google/genai";
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
  // A floating alias, not a dated snapshot: Google points this at whatever it
  // currently recommends as its fast/cheap model. Pinning a specific
  // snapshot (e.g. "gemini-2.5-flash") looked equivalent until it started
  // 404ing with "no longer available to new users" — the snapshot had been
  // retired out from under this project's API key while still appearing in
  // ListModels. The alias is what stays valid across that kind of retirement.
  model: "gemini-flash-latest",
  /**
   * Куда уходим, когда основная модель перегружена.
   *
   * Замер, ради которого это появилось: `gemini-flash-latest` в час пик отвечал
   * 503 «high demand» примерно на половину запросов, а успешные занимали от 18
   * до 37 секунд. Через несколько минут та же модель отвечала за 2,5–9 секунд.
   * То есть отказ здесь — не поломка ключа и не наша ошибка, а состояние
   * чужого сервиса, и переживать его молчаливым «ИИ недоступен» неправильно.
   *
   * `gemini-flash-lite-latest` в том же замере отработал 3 из 3 за 0,8–1,2
   * секунды. Он слабее, и для разбора коуча это была бы заметная потеря, — но
   * задача «назови блюдо на фото и посчитай КБЖУ» ему по силам, а выбор здесь
   * стоит не между хорошим и отличным ответом, а между ответом и пустым
   * экраном.
   *
   * Дублировать сюда датированные снимки (`gemini-2.5-flash`) бессмысленно: в
   * том же замере они дали ошибку на всех трёх попытках — снимки отзывают
   * из-под ключа, ровно как описано ниже.
   */
  fallbackModel: "gemini-flash-lite-latest",
  /** Deterministic-leaning: every caller here wants a structured, factual
   *  answer, not creative variation. */
  temperature: 0.4,
  /**
   * Раньше было 2048. Поднято, потому что за алиасом теперь стоит модель с
   * размышлением, а токены размышления тратятся из того же бюджета: при тесном
   * потолке ответ возвращался пустым, и это классифицировалось как
   * `invalid_response` — то есть выглядело как «ИИ сломался», хотя модель
   * просто не успела дописать JSON.
   */
  maxOutputTokens: 4096,
  /**
   * ПОТОЛОК НА ОДНУ ПОПЫТКУ, А НЕ НА ВЕСЬ ВЫЗОВ. Было 20 000 — и это оказалось
   * главной причиной, по которой анализ еды и внешности перестал работать.
   * Замер тем же SDK и тем же ключом: тривиальный текстовый запрос отвечает за
   * 4,6 с, 13,8 с и больше 20 с — разброс огромный, а фото тяжелее текста.
   * Двадцати секунд перестало хватать, когда алиас переехал на думающую модель,
   * и запрос обрывался ровно на 20 005 мс с AbortError.
   */
  attemptTimeoutMs: 40_000,
  /**
   * Потолок на ВСЕ попытки вместе, включая паузы между ними.
   *
   * Существует, потому что функция на Vercel убивается снаружи: на Hobby
   * предел — 60 секунд, и попытка, начатая на 55-й секунде, не успеет ничего,
   * зато гарантированно превратит понятную ошибку в оборванный запрос. Здесь
   * запас в пять секунд на сериализацию ответа и на сам JSON.
   */
  overallTimeoutMs: 55_000,
  maxRetries: 2,
  /** Base delay for exponential backoff between retries, in ms. */
  retryBaseDelayMs: 500,
  /**
   * Уровень размышления.
   *
   * Модель за алиасом размышляет по умолчанию, и это стоит секунд: у «low»
   * измеренная задержка заметно ниже, а задачи здесь — распознать еду по фото и
   * посчитать КБЖУ — рассуждения на несколько абзацев не требуют.
   *
   * Параметр отправляется «мягко»: если модель за алиасом его не понимает и
   * отвечает 400, вызов повторяется без него (см. INVALID_ARGUMENT ниже). Это
   * не перестраховка — ровно так уже ломался thinkingBudget, когда алиас
   * переехал на другую модель, и второй раз наступать на это не нужно.
   */
  thinkingLevel: ThinkingLevel.LOW,
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
  not_configured: "ИИ временно недоступен. Попробуй позже.",
  rate_limited: "Сейчас слишком много запросов к ИИ. Подождите немного и попробуйте снова.",
  timeout: "ИИ не ответил вовремя. Попробуй ещё раз.",
  invalid_response: "Не удалось разобрать ответ ИИ. Попробуй ещё раз.",
  network: "Не удалось связаться с ИИ. Проверь соединение и попробуй снова.",
  unknown: "Что-то пошло не так на стороне ИИ. Попробуй ещё раз.",
};

/**
 * Не понял ли сервер один из наших параметров.
 *
 * Отличается от прочих 400 тем, что лечится повтором без спорного параметра, —
 * см. thinkingLevel. ApiError не выделяет причину полем, поэтому смотрим на
 * статус и на текст.
 */
function isInvalidArgument(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 400 && /invalid[_ ]argument|unknown name|not supported/i.test(error.message);
}

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
      `Gemini call timed out after ${GEMINI_CONFIG.attemptTimeoutMs}ms`,
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
  /** Overrides GEMINI_CONFIG.temperature for one call. Only the Coach uses
   *  it: reading a food photo wants the most likely answer, writing a coaching
   *  analysis wants a voice, and one global setting cannot be both. */
  temperature?: number;
  /** Overrides GEMINI_CONFIG.maxOutputTokens for one call, for the same
   *  reason — a four-sentence analysis with five bullets needs more room than
   *  a macro breakdown. */
  maxOutputTokens?: number;
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
  const deadline = Date.now() + GEMINI_CONFIG.overallTimeoutMs;
  // Сбрасывается в false, если модель за алиасом не понимает thinkingLevel.
  let sendThinkingLevel = true;
  // Первая попытка — основной моделью, повторы после отказа — запасной.
  let model: string = GEMINI_CONFIG.model;

  for (let attempt = 0; attempt <= GEMINI_CONFIG.maxRetries; attempt += 1) {
    if (attempt > 0) {
      await sleep(GEMINI_CONFIG.retryBaseDelayMs * 2 ** (attempt - 1));
    }

    // Сколько времени осталось от общего бюджета. Попытка, на которую осталось
    // меньше пяти секунд, гарантированно не успеет и только сменит понятную
    // ошибку на оборванный запрос.
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;

    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: input.systemInstruction,
          temperature: input.temperature ?? GEMINI_CONFIG.temperature,
          maxOutputTokens: input.maxOutputTokens ?? GEMINI_CONFIG.maxOutputTokens,
          ...(sendThinkingLevel
            ? { thinkingConfig: { thinkingLevel: GEMINI_CONFIG.thinkingLevel } }
            : {}),
          responseMimeType: "application/json",
          responseJsonSchema: input.jsonSchema,
          abortSignal: AbortSignal.timeout(
            Math.min(GEMINI_CONFIG.attemptTimeoutMs, remaining),
          ),
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
      // Модель не поняла thinkingLevel — снимаем его и не тратим на это
      // попытку: повтор без параметра делается тем же витком цикла.
      if (sendThinkingLevel && isInvalidArgument(error)) {
        sendThinkingLevel = false;
        console.warn("[gemini] thinkingLevel не поддержан моделью — повтор без него");
        attempt -= 1;
        continue;
      }

      lastError = classifyUnknownError(error);
      console.error(
        `[gemini] attempt ${attempt + 1}/${GEMINI_CONFIG.maxRetries + 1} on ${model} failed (${lastError.kind}): ${lastError.message}`,
      );
      if (!lastError.retryable) break;

      // Перегрузка или таймаут основной модели — дальше пробуем запасной.
      // Повторять тем же способом, которым только что не получилось, смысла
      // мало: 503 «high demand» держится минутами, а у нас есть секунды.
      if (
        model === GEMINI_CONFIG.model &&
        (lastError.kind === "network" ||
          lastError.kind === "timeout" ||
          lastError.kind === "rate_limited")
      ) {
        model = GEMINI_CONFIG.fallbackModel;
        console.warn(`[gemini] переключаюсь на запасную модель ${model}`);
      }
    }
  }

  throw lastError ?? new GeminiError("unknown", "Gemini call failed", USER_MESSAGES.unknown, false);
}
