"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getGoals } from "@/features/goals/server/get-goals.action";
import { setGoalCompletedAction } from "@/features/goals/server/set-goal-completed.action";
import { setGoalStepDoneAction } from "@/features/goals/server/set-goal-step-done.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { GoalItem } from "@/features/goals/types";

export function goalsQueryKey(rawInitData: string | undefined) {
  return ["goals", rawInitData] as const;
}

/**
 * The goals list, plus the two mutations that need to feel instant.
 *
 * Checking off a goal or a step is a tap people repeat, so both are optimistic:
 * the cache moves first and rolls back if the write fails. Everything else
 * (create, edit, delete, adding a step) happens inside a modal where a short
 * pending state is honest, so those own their own useMutation locally the way
 * QuickCaptureModal does, and call refresh() when they succeed.
 *
 * refresh() also invalidates the Dashboard. Goals feed both the Life Score and
 * Focus of Day, which are computed server-side on every fetch — so completing a
 * goal here must not leave a stale score sitting in the other tab's cache. No
 * Dashboard code is touched; this only uses the query key it already exports.
 */
export function useGoals() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = goalsQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getGoals(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  /** Snapshot + overwrite, returning the snapshot so onError can restore it. */
  async function applyOptimistic(update: (goals: GoalItem[]) => GoalItem[]) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<GoalItem[]>(key);
    if (previous) queryClient.setQueryData<GoalItem[]>(key, update(previous));
    return { previous };
  }

  function rollback(context: { previous?: GoalItem[] } | undefined) {
    if (context?.previous) queryClient.setQueryData(key, context.previous);
  }

  const goalCompletion = useMutation({
    mutationFn: setGoalCompletedAction,
    onMutate: ({ goalId, isCompleted }) =>
      applyOptimistic((goals) =>
        goals.map((goal) => (goal.id === goalId ? { ...goal, isCompleted } : goal)),
      ),
    onError: (_error, _variables, context) => rollback(context),
    onSettled: refresh,
  });

  const stepCompletion = useMutation({
    mutationFn: setGoalStepDoneAction,
    onMutate: ({ stepId, isDone }) =>
      applyOptimistic((goals) =>
        goals.map((goal) => ({
          ...goal,
          steps: goal.steps.map((step) =>
            step.id === stepId ? { ...step, isDone } : step,
          ),
        })),
      ),
    onError: (_error, _variables, context) => rollback(context),
    onSettled: refresh,
  });

  return {
    goals: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,
    setGoalCompleted: (goalId: string, isCompleted: boolean) =>
      goalCompletion.mutate({ rawInitData, goalId, isCompleted }),
    setStepDone: (stepId: string, isDone: boolean) =>
      stepCompletion.mutate({ rawInitData, stepId, isDone }),
  };
}
