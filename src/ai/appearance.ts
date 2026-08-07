import "server-only";
import { generateStructured, GeminiError } from "@/ai/gemini";
import { requireAiBudget, recordAiUsage } from "@/ai/limits";
import { APPEARANCE_PROMPT } from "@/ai/prompts";
import {
  appearanceAnalysisSchema,
  APPEARANCE_ANALYSIS_JSON_SCHEMA,
  type AppearanceAnalysis,
} from "@/ai/types";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { PlanId } from "@/features/settings/types";

/**
 * Appearance-photo analysis. Same contract as analyzeFoodPhoto: no
 * deterministic fallback, so every failure — no budget left, the model
 * timed out, the response didn't validate — surfaces as a real error the UI
 * shows, rather than degrading silently the way the Coach does.
 *
 * The photo itself is never stored by this module or forwarded anywhere
 * beyond the one Gemini call — see the privacy policy paragraph this feature
 * is described by (features/settings/lib/legal.ts).
 */
export async function analyzeAppearancePhoto(
  userId: string,
  plan: PlanId,
  today: CalendarDay,
  image: { base64Data: string; mimeType: string },
): Promise<AppearanceAnalysis> {
  await requireAiBudget(userId, plan, today);

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

  await recordAiUsage(userId, "appearance", today);
  return result.data;
}
