import "server-only";
import { generateStructured, GeminiError } from "@/ai/gemini";
import { APPEARANCE_PROMPT } from "@/ai/prompts";
import {
  appearanceAnalysisSchema,
  APPEARANCE_ANALYSIS_JSON_SCHEMA,
  type AppearanceAnalysis,
} from "@/ai/types";

/**
 * Appearance-photo analysis. Same contract as analyzeFoodPhoto: no
 * deterministic fallback, so every failure — the model timed out, the response
 * didn't validate — surfaces as a real error the UI shows, rather than
 * degrading silently the way the Coach does.
 *
 * The photo itself is never stored by this module or forwarded anywhere
 * beyond the one Gemini call — see the privacy policy paragraph this feature
 * is described by (features/legal/documents/privacy.ts, раздел 7).
 *
 * Like analyzeFoodPhoto, it knows nothing about tiers or budgets: the caller
 * has already reserved a unit through features/usage before reaching here.
 */
export async function analyzeAppearancePhoto(
  image: { base64Data: string; mimeType: string },
): Promise<AppearanceAnalysis> {
  const raw = await generateStructured({
    systemInstruction: APPEARANCE_PROMPT,
    prompt: "Проанализируй эту фотографию и верни JSON по схеме.",
    image,
    jsonSchema: APPEARANCE_ANALYSIS_JSON_SCHEMA,
  });

  const result = appearanceAnalysisSchema.safeParse(raw);
  if (!result.success) {
    throw new GeminiError(
      "invalid_response",
      `Appearance analysis failed validation: ${result.error.message}`,
      "Не удалось разобрать фото. Попробуй другое фото или другой свет.",
      true,
    );
  }

  return result.data;
}
