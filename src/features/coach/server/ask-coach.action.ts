"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { isCoachEnabled, getSettings } from "@/features/settings/server/settings.repository";
import { todayIn } from "@/shared/lib/calendar-day";
import { askCoachInputSchema } from "@/features/coach/schemas";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import {
  appendCoachMessage,
  listRecentCoachMessages,
} from "@/features/coach/server/coach.repository";
import {
  listCoachMemories,
  rememberCoachFacts,
} from "@/features/coach/server/coach-memory.repository";
import { askCoachModel, isCoachModelEnabled } from "@/ai/coach";
import { consumeCoachMessage, refundCoachMessage } from "@/features/usage/server";
import { hasAiConsent } from "@/features/legal/server";
import { composeAnswer } from "@/features/coach/lib/compose";
import { detectIntent } from "@/features/coach/lib/intents";
import type { CoachAnswer, CoachAskResult } from "@/features/coach/types";

export type AskCoachInput = z.input<typeof askCoachInputSchema>;

/** Prior turns handed to the model as conversation context. */
const CONTEXT_TURNS = 12;

/**
 * One question, one answer, both written to history.
 *
 * The order of operations is the interesting part. The analysis is built first,
 * the deterministic answer second, and only then does the model get a turn — so
 * there is always an answer in hand before anything can fail. Both rows are
 * written last, together: if the request dies halfway, the user is left with
 * the history they had rather than a question that was never answered.
 *
 * The stored answer is whichever one won. Nothing records that it came from the
 * model, because nothing downstream should behave differently — a rules answer
 * and a Gemini answer are the same shape, built from the same facts.
 *
 * Memory is the one thing that outlives the turn. Anything the user said about
 * themselves that will still be true next month goes to CoachMemory, and comes
 * back in the next conversation's prompt — which is what lets the Coach say "ты
 * говорил, что не любишь бег" in September about a sentence typed in August.
 * It is written after the answer and never blocks it (see
 * rememberCoachFacts).
 */
export async function askCoachAction(input: AskCoachInput): Promise<CoachAskResult> {
  const { rawInitData, question, intent } = askCoachInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  // Enforced here as well as in getCoachOverview: the screen cannot reach this
  // while the switch is off, but an action is a public endpoint and the switch
  // is a promise about what leaves the account.
  if (!(await isCoachEnabled(userId))) throw new Error("COACH_DISABLED");

  const analysis = await buildCoachAnalysis(userId, timezone);
  const resolvedIntent = intent ?? detectIntent(question);
  const draft = composeAnswer(resolvedIntent, analysis);

  const [settings, history, memories, aiAllowed] = await Promise.all([
    getSettings(userId),
    listRecentCoachMessages(userId, CONTEXT_TURNS),
    listCoachMemories(userId),
    // Без согласия на трансграничную передачу коуч отвечает детерминированным
    // черновиком — экран работает, ответ есть, наружу не уходит ничего.
    hasAiConsent(userId),
  ]);

  const day = todayIn(timezone);
  const usage = { userId, plan: settings.plan, today: day };

  // A message is reserved before the model is called and given back if the
  // model produced nothing — so a timeout costs the user nothing, and two
  // simultaneous questions cannot both slip past the last unit of the month.
  //
  // Out of budget is not an error here: the Coach has a real answer in hand
  // already (`draft`), so it ships that instead of refusing. That is the whole
  // reason this feature never shows an "upgrade required" screen while the two
  // Vision features do — they have nothing to fall back to.
  const charged =
    aiAllowed && isCoachModelEnabled() && (await consumeCoachMessage(usage)).success;

  const fromModel = charged
    ? await askCoachModel(question, {
        analysis,
        draft,
        history: history.messages,
        memories,
      })
    : null;

  if (charged && !fromModel) await refundCoachMessage(usage);

  const answer: CoachAnswer = fromModel?.answer ?? draft;

  const stored = await appendCoachMessage(userId, {
    role: "user",
    content: question,
    answer: null,
    day,
  });

  const reply = await appendCoachMessage(userId, {
    role: "coach",
    // Plain text first so a bubble renders even if the payload ever stops
    // parsing — see toAnswer in coach.repository.ts.
    content: `${answer.headline}\n\n${answer.body}`,
    answer,
    day,
  });

  if (fromModel && fromModel.memory.length > 0) {
    await rememberCoachFacts(userId, fromModel.memory);
  }

  return { question: stored, reply, source: fromModel ? "gemini" : "rules" };
}
