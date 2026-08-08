"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { composeAnswer } from "@/features/coach/lib/compose";
import { getSettings } from "@/features/settings/server/settings.repository";
import { listCoachMemories } from "@/features/coach/server/coach-memory.repository";
import { askCoachModel, isCoachModelEnabled } from "@/ai/coach";
import { consumeCoachMessage, refundCoachMessage } from "@/features/usage/server";
import { hasAiConsent } from "@/features/legal/server";
import type { CoachAnswer } from "@/features/coach/types";

const REPORT_QUESTION =
  "Дай короткую сводку моего прогресса за последнюю неделю по всем сферам и главный совет на сегодня.";

const inputSchema = z.object({ rawInitData: z.string().min(1).optional() });
export type GenerateReportsAiSummaryInput = z.input<typeof inputSchema>;

/**
 * The on-demand Gemini upgrade for the Reports screen's AI Summary card.
 *
 * The deterministic brief (composeAnswer("brief", ...)) is what get-reports
 * loads by default — free, instant, always available. This is the same
 * upgrade path the Coach chat takes (see ask-coach.action.ts), reused rather
 * than duplicated: one canned question through askCoachModel, spending from
 * the same Coach allowance because it is the same model call.
 *
 * Unlike the chat, this one surfaces the limit instead of silently shipping the
 * draft — the draft is already on screen here, so falling back to it would look
 * like a button that does nothing.
 *
 * Deliberately not written to CoachMessage history — a report refresh is not
 * a conversation turn, and mixing the two would pad the Coach's chat with
 * messages the user never typed.
 */
export type GenerateReportsAiSummaryResult =
  | { ok: true; summary: CoachAnswer }
  | { ok: false; reason: "limit"; message: string; used: number; limit: number }
  | { ok: false; reason: "unavailable" };

export async function generateReportsAiSummaryAction(
  input: GenerateReportsAiSummaryInput,
): Promise<GenerateReportsAiSummaryResult> {
  const { rawInitData } = inputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  const settings = await getSettings(userId);
  const analysis = await buildCoachAnalysis(userId, timezone);

  // Нет согласия на трансграничную передачу — карточка остаётся с
  // детерминированной сводкой, которая уже на экране, и говорит «недоступно».
  if (!isCoachModelEnabled() || !(await hasAiConsent(userId))) {
    return { ok: false, reason: "unavailable" };
  }

  const usage = { userId, plan: settings.plan, today: analysis.today };
  const permission = await consumeCoachMessage(usage);
  if (!permission.success) {
    return {
      ok: false,
      reason: "limit",
      message: permission.message,
      used: permission.used,
      limit: permission.limit,
    };
  }

  const draft = composeAnswer("brief", analysis);
  const memories = await listCoachMemories(userId);

  const fromModel = await askCoachModel(REPORT_QUESTION, {
    analysis,
    draft,
    // No conversation context: a report is not a turn in the chat, which is
    // also why the result is never written to CoachMessage.
    history: [],
    memories,
  });
  if (!fromModel) {
    await refundCoachMessage(usage);
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, summary: fromModel.answer };
}
