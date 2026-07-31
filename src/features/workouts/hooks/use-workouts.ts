"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { getWorkouts } from "@/features/workouts/server/get-workouts.action";
import { setWorkoutSessionCompletedAction } from "@/features/workouts/server/set-workout-session-completed.action";
import { startWorkoutSessionAction } from "@/features/workouts/server/start-workout-session.action";
import { logWorkoutSetAction } from "@/features/workouts/server/log-workout-set.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { WorkoutSessionItem, WorkoutsSnapshot } from "@/features/workouts/types";
import type { WorkoutSetDraft } from "@/features/workouts/schemas";

export function workoutsQueryKey(rawInitData: string | undefined) {
  return ["workouts", rawInitData] as const;
}

/**
 * The workouts snapshot, plus the three mutations that have to feel instant.
 *
 * Logging a set is *the* interaction of this section — it happens a dozen times
 * inside one workout, often with a phone held in one hand between reps — so it
 * is optimistic: the cache moves first and rolls back if the write fails.
 * Because every number on screen is derived from the sets by lib/stats.ts, that
 * single insertion moves the volume figure, the completion ring, the card and
 * the calendar on the same frame.
 *
 * Everything else (create, edit, delete, archive, notes) happens inside a modal
 * where a short pending state is honest, so those own their own useMutation
 * locally the way WorkoutFormModal does and call refresh() when they succeed.
 *
 * refresh() also invalidates the Dashboard: workouts feed the Life Score, which
 * is computed server-side on every fetch, so finishing a session here must not
 * leave a stale score sitting in the other tab's cache.
 */
export function useWorkouts() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = workoutsQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getWorkouts(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  /** Snapshot + overwrite, returning the snapshot so onError can restore it. */
  async function applyOptimistic(update: (snapshot: WorkoutsSnapshot) => WorkoutsSnapshot) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<WorkoutsSnapshot>(key);
    if (previous) queryClient.setQueryData<WorkoutsSnapshot>(key, update(previous));
    return { previous };
  }

  function restore(context: { previous?: WorkoutsSnapshot } | undefined) {
    if (context?.previous) queryClient.setQueryData(key, context.previous);
  }

  const completion = useMutation({
    mutationFn: setWorkoutSessionCompletedAction,
    onMutate: ({ workoutId, day, isCompleted }) =>
      applyOptimistic((snapshot) => {
        const existing = snapshot.sessions.find(
          (session) => session.workoutId === workoutId && session.day === day,
        );

        const completedAt = isCompleted ? new Date().toISOString() : null;

        if (existing) {
          return {
            ...snapshot,
            sessions: snapshot.sessions.map((session) =>
              session === existing ? { ...session, completedAt } : session,
            ),
          };
        }

        // Ticking a day that has no session yet: the server will create one, so
        // the cache shows one too. The placeholder id is never used for set
        // logging — the runner always goes through startSession first — and the
        // refetch on settle replaces it with the real row.
        const placeholder: WorkoutSessionItem = {
          id: `optimistic-${workoutId}-${day}`,
          workoutId,
          day,
          completedAt,
          note: null,
          sets: [],
        };

        return {
          ...snapshot,
          sessions: [...snapshot.sessions, placeholder].sort((a, b) =>
            a.day.localeCompare(b.day),
          ),
        };
      }),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refresh,
  });

  /**
   * Opening a session is not optimistic: its id is what every subsequent set
   * write is addressed to, and a made-up one would have the first few sets of a
   * workout land nowhere. It is a single insert, so the wait is a frame or two.
   */
  const start = useMutation({
    mutationFn: startWorkoutSessionAction,
    onSuccess: ({ sessionId }, { workoutId, day }) => {
      queryClient.setQueryData<WorkoutsSnapshot>(key, (snapshot) => {
        if (!snapshot) return snapshot;
        if (snapshot.sessions.some((session) => session.id === sessionId)) return snapshot;

        return {
          ...snapshot,
          sessions: [
            ...snapshot.sessions.filter(
              (session) => !(session.workoutId === workoutId && session.day === day),
            ),
            { id: sessionId, workoutId, day, completedAt: null, note: null, sets: [] },
          ].sort((a, b) => a.day.localeCompare(b.day)),
        };
      });
      refresh();
    },
  });

  const setLog = useMutation({
    mutationFn: logWorkoutSetAction,
    onMutate: ({ sessionId, set, isDone }) =>
      applyOptimistic((snapshot) => ({
        ...snapshot,
        sessions: snapshot.sessions.map((session) => {
          if (session.id !== sessionId) return session;

          const others = session.sets.filter(
            (item) => !(item.exerciseId === set.exerciseId && item.position === set.position),
          );

          return {
            ...session,
            // Kept sorted the same way the server returns them, so a correction
            // does not visibly reorder the rows under the user's thumb.
            sets: isDone
              ? [...others, set].sort(
                  (a, b) =>
                    a.exerciseId.localeCompare(b.exerciseId) || a.position - b.position,
                )
              : others,
          };
        }),
      })),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refresh,
  });

  const snapshot = query.data;

  return {
    workouts: snapshot?.workouts ?? [],
    sessions: snapshot?.sessions ?? [],
    /**
     * Before the first fetch lands there is no authoritative day yet. Callers
     * only read these alongside `workouts`, which is empty until then, so the
     * empty string never reaches arithmetic that shows on screen.
     */
    today: snapshot?.today ?? "",
    windowStart: snapshot?.windowStart ?? "",
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,
    setSessionCompleted: (workoutId: string, day: CalendarDay, isCompleted: boolean) =>
      completion.mutate({ rawInitData, workoutId, day, isCompleted }),
    startSession: (workoutId: string, day: CalendarDay) =>
      start.mutateAsync({ rawInitData, workoutId, day }),
    isStarting: start.isPending,
    setLogged: (sessionId: string, set: WorkoutSetDraft, isDone: boolean) =>
      setLog.mutate({ rawInitData, sessionId, set, isDone }),
  };
}
