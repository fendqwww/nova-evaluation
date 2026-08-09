import "server-only";
import { generateStructured, GeminiError } from "@/ai/gemini";
import { APPEARANCE_PROMPT, appearanceTask } from "@/ai/prompts";
import {
  appearanceAnalysisSchema,
  APPEARANCE_ANALYSIS_JSON_SCHEMA,
  APPEARANCE_SUBJECT_BRIEF,
  type AppearanceAnalysis,
  type AppearanceSubject,
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
 *
 * `subject` is what the user said they were photographing. It is not a hint —
 * it selects which block of the prompt applies, and without it a physique shot
 * was judged by rules written for a portrait and came back unreadable. It
 * defaults to "custom" ("внешность в целом") so an older caller that does not
 * pass one still gets a whole-appearance reading rather than a face-only one.
 */
export async function analyzeAppearancePhoto(
  image: { base64Data: string; mimeType: string },
  subject: AppearanceSubject = "custom",
): Promise<AppearanceAnalysis> {
  const raw = await generateStructured({
    systemInstruction: APPEARANCE_PROMPT,
    prompt: appearanceTask(APPEARANCE_SUBJECT_BRIEF[subject]),
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
