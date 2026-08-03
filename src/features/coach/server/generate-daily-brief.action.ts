"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { isCoachEnabled, getSettings } from "@/features/settings/server/settings.repository";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { composeAnswer } from "@/features/coach/lib/compose";
import {
  getCoachDailyBrief,
  putCoachDailyBrief,
} from "@/features/coach/server/coach-brief.repository";
import {
  listCoachMemories,
  rememberCoachFacts,
} from "@/features/coach/server/coach-memory.repository";
import { generateCoachBrief } from "@/ai/coach";
import type { CoachAnswer } from "@/features/coach/types";

const inputSchema = z.object({ rawInitData: z.string().min(1).optional() });
export type GenerateDailyBriefInput = z.input<typeof inputSchema>;

/**
 * The Coach's opening message for today, written by the model.
 *
 * This is what makes the screen feel like a coach who was already paying
 * attention rather than a chat box waiting for a prompt: "доброе утро, сегодня
 * ты спал 6 ч 12 мин — это на 1 ч 20 мин меньше твоей нормы, тяжёлую
 * тренировку я бы сегодня не ставил".
 *
 * Three deliberate constraints, in order of importance:
 *
 *   1. It is never the *only* brief. getCoachOverview always ships the
 *      deterministic one, instantly, so the screen is complete before this
 *      call is made and complete again if it fails. This upgrades a card that
 *      already says something true.
 *   2. It costs at most one unit of budget per local day, because the result
 *      is cached by day (see coach-brief.repository.ts) and the cache is
 *      checked here first — including on the path where two screen opens race.
 *   3. It respects the "Ежедневный AI-отчёт" switch in Настройки. That switch
 *      used to be a stored intention for a feature that did not exist; this is
 *      the feature, so turning it off has to actually stop it.
 */
export type GenerateDailyBriefResult =
  | { ok: true; brief: CoachAnswer }
  | { ok: false };

export async function generateDailyBriefAction(
  input: GenerateDailyBriefInput,
): Promise<GenerateDailyBriefResult> {
  const { rawInitData } = inputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  if (!(await isCoachEnabled(userId))) return { ok: false };

  const settings = await getSettings(userId);
  if (!settings.ai.dailyReport) return { ok: false };

  // Checked before the analysis, which is the expensive part: buildCoachAnalysis
  // reads every section of the app, and a brief that is already written makes
  // all of it wasted work. todayIn is the same derivation buildCoachAnalysis
  // uses for analysis.today, so this is the same cache key.
  const today = todayIn(timezone);
  const cached = await getCoachDailyBrief(userId, today);
  if (cached) return { ok: true, brief: cached };

  const analysis = await buildCoachAnalysis(userId, timezone);

  // Re-checked after the analysis for the same reason it is checked before it:
  // between the client deciding to ask and this running, another tab may have
  // written today's brief already.
  const rewritten = await getCoachDailyBrief(userId, analysis.today);
  if (rewritten) return { ok: true, brief: rewritten };

  const draft = composeAnswer("brief", analysis);
  const memories = await listCoachMemories(userId);

  const fromModel = await generateCoachBrief({
    analysis,
    draft,
    // No conversation context on purpose: this is the Coach speaking first,
    // not continuing a thread, and yesterday's questions would pull the
    // briefing toward whatever the user happened to ask about last.
    history: [],
    memories,
    userId,
    plan: settings.plan,
  });

  if (!fromModel) return { ok: false };

  await putCoachDailyBrief(userId, analysis.today, fromModel.answer);
  if (fromModel.memory.length > 0) {
    await rememberCoachFacts(userId, fromModel.memory);
  }

  return { ok: true, brief: fromModel.answer };
}
