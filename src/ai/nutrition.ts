import "server-only";
import { generateStructured, GeminiError } from "@/ai/gemini";
import { requireAiBudget, recordAiUsage } from "@/ai/limits";
import { FOOD_PROMPT } from "@/ai/prompts";
import { foodAnalysisSchema, FOOD_ANALYSIS_JSON_SCHEMA, type FoodAnalysis } from "@/ai/types";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { PlanId } from "@/features/settings/types";

/**
 * Food-photo analysis. Unlike the Coach, this has no deterministic fallback —
 * a photo either gets read by the model or the feature has nothing to show —
 * so every failure here is a real, typed error the server action forwards to
 * the UI, rather than a silent degrade.
 *
 * The result is a draft, never a write: the caller pre-fills the existing
 * food form with it, and nothing reaches NutritionFood until the user
 * confirms — possibly after editing every field the model got wrong.
 */
export async function analyzeFoodPhoto(
  userId: string,
  plan: PlanId,
  today: CalendarDay,
  image: { base64Data: string; mimeType: string },
): Promise<FoodAnalysis> {
  // Throws AiLimitExceededError before a single token is spent — a request
  // that will be refused must never reach the model.
  await requireAiBudget(userId, plan, today);

  const raw = await generateStructured({
    systemInstruction: FOOD_PROMPT,
    prompt: "Проанализируй это фото еды и верни JSON по схеме.",
    image,
    jsonSchema: FOOD_ANALYSIS_JSON_SCHEMA,
  });

  const result = foodAnalysisSchema.safeParse(raw);
  if (!result.success) {
    throw new GeminiError(
      "invalid_response",
      `Food analysis failed validation: ${result.error.message}`,
      "Не удалось распознать фото. Попробуй другое или заполни продукт вручную.",
      true,
    );
  }

  await recordAiUsage(userId, "food", today);
  return result.data;
}
