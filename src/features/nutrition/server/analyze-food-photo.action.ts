"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { getSettings } from "@/features/settings/server/settings.repository";
import {
  getCachedFoodAnalysis,
  hashFoodImage,
  putCachedFoodAnalysis,
} from "@/features/nutrition/server/food-analysis-cache.repository";
import { consumeFoodAnalysis, refundFoodAnalysis } from "@/features/usage/server";
import { hasAiConsent } from "@/features/legal/server";
import { CONSENT_REQUIRED_MESSAGE } from "@/features/legal/constants";
import { analyzeFoodPhoto } from "@/ai/nutrition";
import { GeminiError } from "@/ai/gemini";
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
 * redacts a thrown Error's message in production, and the sentence explaining
 * which limit was reached is exactly the information the UI needs to keep.
 *
 * The order of operations is the whole point:
 *
 *   1. The cache, first. An image these bytes have been seen before costs
 *      nothing — no Gemini call and no unit of the user's allowance, because
 *      the allowance exists to bound what we spend and this spends nothing.
 *   2. The reservation, atomically, *before* the model. A check that merely
 *      read the counter would let a double-tap spend two calls; see
 *      features/usage/server/usage.repository.ts.
 *   3. The refund, on every failure path. A timeout or an unparseable response
 *      is our problem, not something to charge a FREE user's one weekly
 *      analysis for.
 */
export type AnalyzeFoodPhotoResult =
  | { ok: true; analysis: FoodAnalysis; cached: boolean }
  | { ok: false; reason: "limit"; message: string; used: number; limit: number }
  | { ok: false; reason: "error"; message: string };

export async function analyzeFoodPhotoAction(
  input: AnalyzeFoodPhotoInput,
): Promise<AnalyzeFoodPhotoResult> {
  const { rawInitData, imageData } = analyzeFoodPhotoInputSchema.parse(input);
  // The user's own calendar day, because every usage window — the week, the
  // month — is measured in their timezone rather than at UTC midnight.
  const { userId, timezone } = await requireUserContext(rawInitData);
  const settings = await getSettings(userId);

  // Основание обработки — раньше всего остального. Переключатель в настройках
  // отвечает на вопрос «хочет ли пользователь», согласие на трансграничную
  // передачу — на вопрос «вправе ли мы»; второй вопрос главнее, и проверять его
  // надо даже там, где переключатель включён (например, у аккаунта, который
  // отозвал согласие в другой вкладке).
  if (!(await hasAiConsent(userId))) {
    return { ok: false, reason: "error", message: CONSENT_REQUIRED_MESSAGE };
  }

  // The "AI Vision" switch in Настройки. Checked before the photo travels
  // anywhere, so off really means nothing reaches Gemini — the form still
  // works, filled in by hand.
  if (!settings.ai.vision) {
    return { ok: false, reason: "error", message: "AI Vision выключен в настройках." };
  }

  const image = parseImageDataUrl(imageData);
  const imageHash = hashFoodImage(image);

  const cached = await getCachedFoodAnalysis(imageHash);
  if (cached) return { ok: true, analysis: cached, cached: true };

  const usage = { userId, plan: settings.plan, today: todayIn(timezone) };

  const permission = await consumeFoodAnalysis(usage);
  if (!permission.success) {
    return {
      ok: false,
      reason: "limit",
      message: permission.message,
      used: permission.used,
      limit: permission.limit,
    };
  }

  try {
    const analysis = await analyzeFoodPhoto(image);
    // Written after the answer is in hand, and never allowed to fail the
    // request: a cache miss next time is a slower app, a thrown error here
    // would be a lost analysis the user already paid for.
    await putCachedFoodAnalysis(imageHash, analysis);
    return { ok: true, analysis, cached: false };
  } catch (error) {
    await refundFoodAnalysis(usage);

    if (error instanceof GeminiError) {
      return { ok: false, reason: "error", message: error.userMessage };
    }
    console.error("[analyzeFoodPhotoAction] unexpected failure", error);
    return {
      ok: false,
      reason: "error",
      message: "Не удалось проанализировать фото. Попробуй ещё раз.",
    };
  }
}
