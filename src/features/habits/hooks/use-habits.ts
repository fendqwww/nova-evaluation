"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { getHabits } from "@/features/habits/server/get-habits.action";
import { setHabitLogAction } from "@/features/habits/server/set-habit-log.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { HabitsSnapshot } from "@/features/habits/types";

export function habitsQueryKey(rawInitData: string | undefined) {
  return ["habits", rawInitData] as const;
}

/**
 * The habits snapshot, plus the one mutation that has to feel instant.
 *
 * Ticking a day is *the* interaction of this section — it is what a user opens
 * the app to do, often several times in a row — so it is optimistic: the cache
 * moves first and rolls back if the write fails. Because every number on screen
 * is derived from the log by lib/stats.ts, that single string insertion moves
 * the streak, the ring, the week strip and the calendar on the same frame.
 *
 * Everything else (create, edit, delete, archive) happens inside a modal where
 * a short pending state is honest, so those own their own useMutation locally
 * the way GoalFormModal does, and call refresh() when they succeed.
 *
 * refresh() also invalidates the Dashboard: habits feed the Life Score, which
 * is computed server-side on every fetch, so keeping a habit here must not
 * leave a stale score sitting in the other tab's cache. No Dashboard code is
 * touched; this only uses the query key it already exports.
 */
export function useHabits() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = habitsQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getHabits(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  /** Snapshot + overwrite, returning the snapshot so onError can restore it. */
  async function applyOptimistic(update: (snapshot: HabitsSnapshot) => HabitsSnapshot) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<HabitsSnapshot>(key);
    if (previous) queryClient.setQueryData<HabitsSnapshot>(key, update(previous));
    return { previous };
  }

  const logToggle = useMutation({
    mutationFn: setHabitLogAction,
    onMutate: ({ habitId, day, isDone }) =>
      applyOptimistic((snapshot) => ({
        ...snapshot,
        habits: snapshot.habits.map((habit) => {
          if (habit.id !== habitId) return habit;
          // Kept sorted and de-duplicated: stats walks the log as a set, but
          // the calendar and any future range read rely on ascending order,
          // and an upsert on the server can never produce a duplicate — the
          // optimistic path must not either.
          const log = isDone
            ? Array.from(new Set([...habit.log, day])).sort()
            : habit.log.filter((entry) => entry !== day);
          return { ...habit, log };
        }),
      })),
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: refresh,
  });

  const snapshot = query.data;

  return {
    habits: snapshot?.habits ?? [],
    /**
     * Before the first fetch lands there is no authoritative day yet. Callers
     * only read these alongside `habits`, which is empty until then, so the
     * empty string is never used for arithmetic that reaches the screen.
     */
    today: snapshot?.today ?? "",
    windowStart: snapshot?.windowStart ?? "",
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,
    setDayLogged: (habitId: string, day: CalendarDay, isDone: boolean) =>
      logToggle.mutate({ rawInitData, habitId, day, isDone }),
  };
}
