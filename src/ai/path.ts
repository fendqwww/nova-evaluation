import "server-only";
import { generateStructured, isGeminiEnabled } from "@/ai/gemini";
import { PATH_PROMPT, pathTask } from "@/ai/prompts";
import { PATH_PLAN_JSON_SCHEMA, pathPlanSchema, type PathPlan } from "@/features/path/schemas";
import { PATH_GOAL_KIND_META, type PathGoalKind } from "@/features/path/lib/goal-kinds";

/**
 * Построение маршрута моделью — улучшение поверх работающего плана.
 *
 * Ровно та же архитектура, что у коуча, и по той же причине: эта функция никогда
 * не бросает. Нет ключа, таймаут, лимит на стороне вызывающего, ответ не прошёл
 * zod — всё это возвращает null, и вызывающий записывает шаблонный план. «Создать
 * мой путь» не имеет права закончиться сообщением об ошибке, потому что это
 * первая кнопка, которую нажимает новый человек.
 *
 * Лимиты здесь не считаются. Экшен резервирует единицу через features/usage
 * до вызова и возвращает её, когда здесь вышел null — то же разделение, что во
 * всех остальных AI-модулях: этот слой знает про модель и ничего не знает про
 * тарифы.
 *
 * Температура выше дефолтных 0.4: план — это текст, обращённый к человеку, и на
 * 0.4 он выходит одинаковыми формулировками у всех семи целей. Факты от
 * температуры не плывут — они все в промпте и все проверены на обратном пути.
 */
const PATH_TEMPERATURE = 0.6;

/** Четыре этапа с шагами и подсказками не влезают в дефолтные 2048. */
const PATH_MAX_TOKENS = 3072;

export function isPathModelEnabled(): boolean {
  return isGeminiEnabled();
}

export interface PathModelRequest {
  kind: PathGoalKind;
  /** Своими словами, если человек написал. */
  wish: string | null;
  /**
   * Факты о человеке, уже посчитанные приложением, — построчно. Модели
   * запрещено вводить числа помимо этих, см. правило 1 в промпте.
   */
  facts: string[];
  /** Шаблонный план — пол, который модель обязана превзойти. */
  draft: PathPlan;
}

/**
 * Лучший план, чем черновик, или null.
 *
 * Null — совершенно обычный исход, и вызывающий обязан быть к нему готов.
 */
export async function buildPathPlan(request: PathModelRequest): Promise<PathPlan | null> {
  try {
    const raw = await generateStructured({
      systemInstruction: PATH_PROMPT,
      prompt: pathTask({
        goalLabel: PATH_GOAL_KIND_META[request.kind].label,
        wish: request.wish,
        facts: request.facts.join("\n"),
        draftJson: JSON.stringify(request.draft),
      }),
      jsonSchema: PATH_PLAN_JSON_SCHEMA,
      temperature: PATH_TEMPERATURE,
      maxOutputTokens: PATH_MAX_TOKENS,
    });

    const parsed = pathPlanSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[ai/path] plan failed validation: ${parsed.error.message}`);
      return null;
    }

    return parsed.data;
  } catch (error) {
    // Уже классифицировано и залогировано внутри generateStructured — здесь
    // остаётся только не дать исключению дойти до экшена.
    console.error(`[ai/path] plan generation failed: ${String(error)}`);
    return null;
  }
}
