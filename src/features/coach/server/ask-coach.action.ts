"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { askCoachInputSchema } from "@/features/coach/schemas";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import {
  appendCoachMessage,
  listRecentCoachMessages,
} from "@/features/coach/server/coach.repository";
import { askClaude } from "@/features/coach/server/claude";
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
 * and a Claude answer are the same shape, built from the same facts.
 */
export async function askCoachAction(input: AskCoachInput): Promise<CoachAskResult> {
  const { rawInitData, question, intent } = askCoachInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  const analysis = await buildCoachAnalysis(userId, timezone);
  const resolvedIntent = intent ?? detectIntent(question);
  const draft = composeAnswer(resolvedIntent, analysis);

  const history = await listRecentCoachMessages(userId, CONTEXT_TURNS);
  const fromModel = await askClaude(question, analysis, draft, history.messages);

  const answer: CoachAnswer = fromModel ?? draft;
  const day = todayIn(timezone);

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

  return { question: stored, reply, source: fromModel ? "claude" : "rules" };
}
