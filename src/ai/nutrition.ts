import "server-only";
import { generateStructured, GeminiError } from "@/ai/gemini";
import { FOOD_PROMPT } from "@/ai/prompts";
import { foodAnalysisSchema, FOOD_ANALYSIS_JSON_SCHEMA, type FoodAnalysis } from "@/ai/types";

/**
 * Food-photo analysis. Unlike the Coach, this has no deterministic fallback —
 * a photo either gets read by the model or the feature has nothing to show —
 * so every failure here is a real, typed error the server action forwards to
 * the UI, rather than a silent degrade.
 *
 * The result is a draft, never a write: the caller pre-fills the existing
 * food form with it, and nothing reaches NutritionFood until the user
 * confirms — possibly after editing every field the model got wrong.
 *
 * Knows nothing about accounts, tiers or budgets. Whether this call is allowed
 * to happen is decided one layer up, by the server action, which has already
 * reserved a unit through features/usage before calling in here — see the note
 * on usage.service.ts for why the gate lives there and not in this module.
 */
export async function analyzeFoodPhoto(
  image: { base64Data: string; mimeType: string },
): Promise<FoodAnalysis> {
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

  return result.data;
}
