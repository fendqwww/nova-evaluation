"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { getAppearance } from "@/features/appearance/server/get-appearance.action";
import { createRoutineAction } from "@/features/appearance/server/create-routine.action";
import { updateRoutineAction } from "@/features/appearance/server/update-routine.action";
import { setRoutineArchivedAction } from "@/features/appearance/server/set-routine-archived.action";
import { deleteRoutineAction } from "@/features/appearance/server/delete-routine.action";
import { setRoutineDoneAction } from "@/features/appearance/server/set-routine-done.action";
import { setStepDoneAction } from "@/features/appearance/server/set-step-done.action";
import { createPhotoAction } from "@/features/appearance/server/create-photo.action";
import { updatePhotoAction } from "@/features/appearance/server/update-photo.action";
import { deletePhotoAction } from "@/features/appearance/server/delete-photo.action";
import { createCareGoalAction } from "@/features/appearance/server/create-care-goal.action";
import { updateCareGoalAction } from "@/features/appearance/server/update-care-goal.action";
import { setCareGoalCompletedAction } from "@/features/appearance/server/set-care-goal-completed.action";
import { deleteCareGoalAction } from "@/features/appearance/server/delete-care-goal.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import { activeStepsOn } from "@/features/appearance/lib/stats";
import type { AppearanceSnapshot, CareRoutineItem } from "@/features/appearance/types";
import type { CareGoalDraft, PhotoDraft, RoutineDraft } from "@/features/appearance/schemas";

export function appearanceQueryKey(rawInitData: string | undefined) {
  return ["appearance", rawInitData] as const;
}

/**
 * The appearance snapshot, plus the two mutations that have to feel instant.
 *
 * Ticking a step and ticking a whole routine are the interactions that happen
 * several times a day, mid-routine, often on a bad connection in a bathroom —
 * the same role logging a set plays for Workouts — so both are optimistic: the
 * cache moves first and rolls back if the write fails. Everything else (the
 * routine form, photos, goals) happens inside a modal where a short pending
 * state is honest, so those call refresh() on success.
 *
 * The optimistic updates apply the *same* rule the server will: a routine with
 * a checklist gets all of its steps ticked, one without gets its own log entry.
 * Keeping the two in step is what stops the card flickering between two
 * different answers when the refetch lands.
 *
 * refresh() also invalidates the Dashboard: appearance feeds the Life Score,
 * which is computed server-side on every fetch, so finishing a routine here
 * must not leave a stale score in the other tab's cache.
 */
export function useAppearance() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = appearanceQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getAppearance(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  async function applyOptimistic(update: (snapshot: AppearanceSnapshot) => AppearanceSnapshot) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<AppearanceSnapshot>(key);
    if (previous) queryClient.setQueryData<AppearanceSnapshot>(key, update(previous));
    return { previous };
  }

  function restore(context: { previous?: AppearanceSnapshot } | undefined) {
    if (context?.previous) queryClient.setQueryData(key, context.previous);
  }

  const routineDone = useMutation({
    mutationFn: setRoutineDoneAction,
    onMutate: ({ routineId, day, isDone }) =>
      applyOptimistic((snapshot) => ({
        ...snapshot,
        routines: snapshot.routines.map((routine) =>
          routine.id === routineId ? withRoutineDone(routine, day, isDone) : routine,
        ),
      })),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refresh,
  });

  const stepDone = useMutation({
    mutationFn: setStepDoneAction,
    onMutate: ({ stepId, day, isDone }) =>
      applyOptimistic((snapshot) => ({
        ...snapshot,
        routines: snapshot.routines.map((routine) => ({
          ...routine,
          steps: routine.steps.map((step) =>
            step.id === stepId ? { ...step, log: withDay(step.log, day, isDone) } : step,
          ),
        })),
      })),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refresh,
  });

  const routineCreate = useMutation({ mutationFn: createRoutineAction, onSuccess: refresh });
  const routineUpdate = useMutation({ mutationFn: updateRoutineAction, onSuccess: refresh });
  const routineArchive = useMutation({ mutationFn: setRoutineArchivedAction, onSuccess: refresh });
  const routineDelete = useMutation({ mutationFn: deleteRoutineAction, onSuccess: refresh });

  const photoCreate = useMutation({ mutationFn: createPhotoAction, onSuccess: refresh });
  const photoUpdate = useMutation({ mutationFn: updatePhotoAction, onSuccess: refresh });
  const photoDelete = useMutation({ mutationFn: deletePhotoAction, onSuccess: refresh });

  const goalCreate = useMutation({ mutationFn: createCareGoalAction, onSuccess: refresh });
  const goalUpdate = useMutation({ mutationFn: updateCareGoalAction, onSuccess: refresh });
  const goalComplete = useMutation({ mutationFn: setCareGoalCompletedAction, onSuccess: refresh });
  const goalDelete = useMutation({ mutationFn: deleteCareGoalAction, onSuccess: refresh });

  const snapshot = query.data;

  return {
    routines: snapshot?.routines ?? [],
    photos: snapshot?.photos ?? [],
    goals: snapshot?.goals ?? [],
    gender: snapshot?.gender ?? "other",
    today: snapshot?.today ?? "",
    windowStart: snapshot?.windowStart ?? "",
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,

    setRoutineDone: (routineId: string, day: CalendarDay, isDone: boolean) =>
      routineDone.mutate({ rawInitData, routineId, day, isDone }),
    setStepDone: (stepId: string, day: CalendarDay, isDone: boolean) =>
      stepDone.mutate({ rawInitData, stepId, day, isDone }),

    createRoutine: (draft: RoutineDraft) => routineCreate.mutateAsync({ rawInitData, draft }),
    updateRoutine: (routineId: string, draft: RoutineDraft) =>
      routineUpdate.mutateAsync({ rawInitData, routineId, draft }),
    setRoutineArchived: (routineId: string, isArchived: boolean) =>
      routineArchive.mutate({ rawInitData, routineId, isArchived }),
    deleteRoutine: (routineId: string) => routineDelete.mutateAsync({ rawInitData, routineId }),

    createPhoto: (draft: PhotoDraft) => photoCreate.mutateAsync({ rawInitData, draft }),
    updatePhoto: (photoId: string, area: PhotoDraft["area"], note: string | null) =>
      photoUpdate.mutateAsync({ rawInitData, photoId, area, note }),
    deletePhoto: (photoId: string) => photoDelete.mutateAsync({ rawInitData, photoId }),

    createGoal: (draft: CareGoalDraft) => goalCreate.mutateAsync({ rawInitData, draft }),
    updateGoal: (goalId: string, draft: CareGoalDraft) =>
      goalUpdate.mutateAsync({ rawInitData, goalId, draft }),
    setGoalCompleted: (goalId: string, isCompleted: boolean) =>
      goalComplete.mutate({ rawInitData, goalId, isCompleted }),
    deleteGoal: (goalId: string) => goalDelete.mutateAsync({ rawInitData, goalId }),
  };
}

function withDay(log: CalendarDay[], day: CalendarDay, isDone: boolean): CalendarDay[] {
  if (isDone) return log.includes(day) ? log : [...log, day].sort();
  return log.filter((entry) => entry !== day);
}

/**
 * The optimistic mirror of setRoutineDone, applying the same rule the server
 * will: steps when there are any that existed on that day, the routine's own
 * log when there are not.
 */
function withRoutineDone(
  routine: CareRoutineItem,
  day: CalendarDay,
  isDone: boolean,
): CareRoutineItem {
  const active = new Set(activeStepsOn(routine, day).map((step) => step.id));

  if (active.size === 0) {
    return { ...routine, log: withDay(routine.log, day, isDone) };
  }

  return {
    ...routine,
    steps: routine.steps.map((step) =>
      active.has(step.id) ? { ...step, log: withDay(step.log, day, isDone) } : step,
    ),
  };
}
