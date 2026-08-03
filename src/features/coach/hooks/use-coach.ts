"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getCoachOverview } from "@/features/coach/server/get-coach-overview.action";
import { getCoachHistory } from "@/features/coach/server/get-coach-history.action";
import { askCoachAction } from "@/features/coach/server/ask-coach.action";
import { generateDailyBriefAction } from "@/features/coach/server/generate-daily-brief.action";
import type { CoachIntent } from "@/features/coach/lib/intents";
import type { CoachOverview } from "@/features/coach/types";

export function coachQueryKey(rawInitData: string | undefined) {
  return ["coach", rawInitData] as const;
}

/**
 * The Coach screen's data, plus the two things it can do.
 *
 * Asking is *not* optimistic, and that is deliberate: the answer is the point
 * of the interaction, and a card invented client-side would either be a
 * different answer from the one the server writes to history or a placeholder
 * pretending to be one. Instead the question the user just sent is echoed from
 * `ask.variables` while the request is in flight, so the bubble appears
 * immediately and only the reply is waited on.
 *
 * Both writes push straight into the cached overview rather than invalidating
 * it. Re-running getCoachOverview would rebuild the entire analysis — every
 * goal, habit and task, plus yesterday — to append two chat rows that the
 * response already contains.
 */
export function useCoach() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = coachQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getCoachOverview(rawInitData),
  });

  const ask = useMutation({
    mutationFn: askCoachAction,
    onSuccess: (result) => {
      queryClient.setQueryData<CoachOverview | null>(key, (previous) =>
        previous
          ? { ...previous, history: [...previous.history, result.question, result.reply] }
          : previous,
      );
    },
  });

  /**
   * The Coach's opening message for today, fetched once per day.
   *
   * Fired from an effect rather than from the query itself because it is a
   * write that costs a Gemini call, and getCoachOverview is deliberately a
   * pure read (see the note on that action). The server decides whether it is
   * worth asking — `canWriteBrief` is already false when a briefing exists,
   * when there is no key, or when the daily-report switch is off — and the ref
   * below stops React's double-invoked effects in development from asking
   * twice for the same day.
   *
   * A failure is silent by design: the deterministic brief is already on
   * screen and is a complete answer, so there is nothing to report and nothing
   * to retry.
   */
  const brief = useMutation({
    mutationFn: generateDailyBriefAction,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData<CoachOverview | null>(key, (previous) =>
        previous
          ? { ...previous, brief: result.brief, briefSource: "gemini", canWriteBrief: false }
          : previous,
      );
    },
  });

  const requestedBriefFor = useRef<string | null>(null);
  const overviewData = query.data ?? null;
  const briefMutate = brief.mutate;

  useEffect(() => {
    if (!overviewData?.canWriteBrief) return;
    if (requestedBriefFor.current === overviewData.today) return;

    requestedBriefFor.current = overviewData.today;
    briefMutate({ rawInitData });
  }, [overviewData, briefMutate, rawInitData]);

  const loadEarlier = useMutation({
    mutationFn: getCoachHistory,
    onSuccess: (page) => {
      queryClient.setQueryData<CoachOverview | null>(key, (previous) =>
        previous
          ? {
              ...previous,
              history: [...page.messages, ...previous.history],
              hasMoreHistory: page.hasMore,
            }
          : previous,
      );
    },
  });

  // null is the server saying "AI Coach выключен" (see getCoachOverview), which
  // is a different screen from an error and from an empty account — so it is
  // surfaced as its own flag rather than collapsed into `overview === undefined`.
  const overview = query.data ?? undefined;
  const isDisabled = query.data === null;
  const oldestId = overview?.history[0]?.id ?? null;

  return {
    overview,
    isDisabled,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh: () => void queryClient.invalidateQueries({ queryKey: key }),

    /** The model is writing today's briefing over the deterministic one. */
    isWritingBrief: brief.isPending,

    /**
     * The question currently in flight, echoed back for the pending bubble.
     * Kept visible through a failed send too — `ask.variables` still holds it
     * after the mutation settles — so the error line has something to attach
     * to instead of the just-typed question vanishing.
     */
    pendingQuestion:
      ask.isPending || ask.isError ? (ask.variables?.question ?? null) : null,
    isAnswering: ask.isPending,
    askFailed: ask.isError,
    ask: (question: string, intent: CoachIntent | null) =>
      ask.mutate({ rawInitData, question, intent }),

    canLoadEarlier: Boolean(overview?.hasMoreHistory && oldestId),
    isLoadingEarlier: loadEarlier.isPending,
    loadEarlier: () => {
      if (!oldestId) return;
      loadEarlier.mutate({ rawInitData, beforeId: oldestId });
    },
  };
}
