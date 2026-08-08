"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { getSettings, isCoachEnabled } from "@/features/settings/server/settings.repository";
import { COACH_HISTORY_PAGE } from "@/features/coach/schemas";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { listRecentCoachMessages } from "@/features/coach/server/coach.repository";
import { getCoachDailyBrief } from "@/features/coach/server/coach-brief.repository";
import { composeAnswer, composeSignals } from "@/features/coach/lib/compose";
import { buildDailyReport } from "@/features/coach/lib/report";
import { greetingFor } from "@/features/coach/lib/analyze";
import { isCoachModelEnabled } from "@/ai/coach";
import { hasAiConsent } from "@/features/legal/server";
import type { CoachOverview } from "@/features/coach/types";

/**
 * The whole Coach screen in one fetch.
 *
 * Deliberately a pure read — it writes nothing, including the daily analysis.
 * "Каждый день новый анализ" is satisfied by *recomputing* the day-over-day
 * report on every load rather than by posting a generated message once a
 * morning: recomputation is correct for the user who skipped yesterday, cannot
 * duplicate itself under two concurrent loads, and cannot go stale when a habit
 * is un-ticked an hour later.
 *
 * The brief is composed deterministically so the first screen is never blank
 * and never waits on a network call. The model writes in the chat, where a
 * couple of seconds is a conversation rather than a loading screen.
 *
 * Returns null when the user has switched AI Coach off in Настройки. The check
 * comes first, before the analysis is built, which is what makes the privacy
 * policy's "если AI Coach выключен, наружу не уходит ничего" literally true:
 * nothing is assembled, so there is nothing to send. Null rather than an empty
 * overview because "выключено" and "нет данных" are different screens.
 */
export async function getCoachOverview(
  rawInitData: string | undefined,
): Promise<CoachOverview | null> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  if (!(await isCoachEnabled(userId))) return null;

  const analysis = await buildCoachAnalysis(userId, timezone);
  const [history, aiBrief, settings, aiAllowed] = await Promise.all([
    listRecentCoachMessages(userId, COACH_HISTORY_PAGE),
    // Today's model-written briefing if it has already been generated. Reading
    // it is free; writing it is a Gemini call the screen makes separately (see
    // generate-daily-brief.action.ts), which is what keeps this a pure read.
    getCoachDailyBrief(userId, analysis.today),
    getSettings(userId),
    // Без согласия на трансграничную передачу просить у экрана разбор незачем:
    // generate-daily-brief всё равно откажет, и кнопка вела бы в пустоту.
    hasAiConsent(userId),
  ]);

  return {
    today: analysis.today,
    greeting: greetingFor(analysis.profile.localHour, analysis.profile.firstName),
    analysis,
    brief: aiBrief ?? composeAnswer("brief", analysis),
    briefSource: aiBrief ? "gemini" : "rules",
    // Whether it is worth *asking* for one. A screen that cannot get a model
    // brief — no key, the daily-report switch off, one already written — must
    // not fire a request that can only come back empty.
    canWriteBrief:
      aiBrief === null && aiAllowed && isCoachModelEnabled() && settings.ai.dailyReport,
    signals: composeSignals(analysis),
    report: buildDailyReport(analysis),
    history: history.messages,
    hasMoreHistory: history.hasMore,
  };
}
