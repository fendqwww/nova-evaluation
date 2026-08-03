"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { getSettings } from "@/features/settings/server/settings.repository";
import { analyzeFoodPhoto } from "@/ai/nutrition";
import { GeminiError } from "@/ai/gemini";
import { AiLimitExceededError } from "@/ai/limits";
import { imageDataUrlSchema, parseImageDataUrl, type FoodAnalysis } from "@/ai/types";

/** Generous relative to a stored progress photo (900k chars): this image is
 *  never written to a row, only forwarded once, so there is no long-term
 *  storage cost to weigh against a sharper photo. */
const FOOD_PHOTO_MAX_CHARS = 1_500_000;

const analyzeFoodPhotoInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  imageData: imageDataUrlSchema(FOOD_PHOTO_MAX_CHARS),
});

export type AnalyzeFoodPhotoInput = z.input<typeof analyzeFoodPhotoInputSchema>;

/**
 * Read a food photo into an editable draft.
 *
 * Never a write — the result pre-fills FoodFormModal, and nothing reaches
 * NutritionFood until the user confirms it there, possibly after correcting
 * every field. A discriminated result rather than a thrown error: Next.js
 * redacts a thrown Error's message in production, and "how many analyses do
 * I have left" is exactly the information the UI needs to keep, not discard.
 */
export type AnalyzeFoodPhotoResult =
  | { ok: true; analysis: FoodAnalysis }
  | { ok: false; reason: "limit"; used: number; limit: number }
  | { ok: false; reason: "error"; message: string };

export async function analyzeFoodPhotoAction(
  input: AnalyzeFoodPhotoInput,
): Promise<AnalyzeFoodPhotoResult> {
  const { rawInitData, imageData } = analyzeFoodPhotoInputSchema.parse(input);
  // The user's own calendar day, because the AI budget renews per day in their
  // timezone rather than at UTC midnight — see src/ai/limits.ts.
  const { userId, timezone } = await requireUserContext(rawInitData);
  const settings = await getSettings(userId);

  // The "AI Vision" switch in Настройки. Checked before the photo travels
  // anywhere, so off really means nothing reaches Gemini — the form still
  // works, filled in by hand.
  if (!settings.ai.vision) {
    return { ok: false, reason: "error", message: "AI Vision выключен в настройках." };
  }

  try {
    const analysis = await analyzeFoodPhoto(
      userId,
      settings.plan,
      todayIn(timezone),
      parseImageDataUrl(imageData),
    );
    return { ok: true, analysis };
  } catch (error) {
    if (error instanceof AiLimitExceededError) {
      return { ok: false, reason: "limit", used: error.used, limit: error.limit };
    }
    if (error instanceof GeminiError) {
      return { ok: false, reason: "error", message: error.userMessage };
    }
    console.error("[analyzeFoodPhotoAction] unexpected failure", error);
    return { ok: false, reason: "error", message: "Не удалось проанализировать фото. Попробуйте ещё раз." };
  }
}
