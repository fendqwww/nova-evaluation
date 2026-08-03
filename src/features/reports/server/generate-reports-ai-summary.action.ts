"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { composeAnswer } from "@/features/coach/lib/compose";
import { getSettings } from "@/features/settings/server/settings.repository";
import { listCoachMemories } from "@/features/coach/server/coach-memory.repository";
import { askCoachModel } from "@/ai/coach";
import { getAiUsageStatus } from "@/ai/limits";
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
 * than duplicated: one canned question through askCoachModel, budget-checked
 * up front so a FREE user out of usage gets an honest "limit" reason instead
 * of a spent call that returns null anyway.
 *
 * Deliberately not written to CoachMessage history — a report refresh is not
 * a conversation turn, and mixing the two would pad the Coach's chat with
 * messages the user never typed.
 */
export type GenerateReportsAiSummaryResult =
  | { ok: true; summary: CoachAnswer }
  | { ok: false; reason: "limit"; used: number; limit: number }
  | { ok: false; reason: "unavailable" };

export async function generateReportsAiSummaryAction(
  input: GenerateReportsAiSummaryInput,
): Promise<GenerateReportsAiSummaryResult> {
  const { rawInitData } = inputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  const settings = await getSettings(userId);
  const analysis = await buildCoachAnalysis(userId, timezone);

  const usage = await getAiUsageStatus(userId, settings.plan, analysis.today);
  if (!usage.allowed) {
    return { ok: false, reason: "limit", used: usage.used, limit: usage.limit ?? 0 };
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
    userId,
    plan: settings.plan,
  });
  if (!fromModel) return { ok: false, reason: "unavailable" };

  return { ok: true, summary: fromModel.answer };
}
