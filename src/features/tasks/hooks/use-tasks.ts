"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getTasks } from "@/features/tasks/server/get-tasks.action";
import { setTaskCompletedAction } from "@/features/tasks/server/set-task-completed.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { TasksSnapshot } from "@/features/tasks/types";

export function tasksQueryKey(rawInitData: string | undefined) {
  return ["tasks", rawInitData] as const;
}

/**
 * The tasks snapshot, plus the one mutation that has to feel instant.
 *
 * Checking a task off is a tap people repeat down a list, so it is optimistic:
 * the cache moves first and rolls back if the write fails. Everything else
 * (create, edit, delete, clearing completed) happens inside a modal or behind a
 * confirm where a short pending state is honest, so those own their own
 * useMutation locally the way GoalFormModal does, and call refresh() on success.
 *
 * refresh() also invalidates the Dashboard: tasks feed both the Life Score and
 * Focus of Day, which are computed server-side on every fetch, so completing
 * one here must not leave a stale score sitting in the other tab's cache. No
 * Dashboard code is touched; this only uses the query key it already exports.
 */
export function useTasks() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = tasksQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getTasks(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  const completion = useMutation({
    mutationFn: setTaskCompletedAction,
    onMutate: async ({ taskId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TasksSnapshot>(key);

      if (previous) {
        queryClient.setQueryData<TasksSnapshot>(key, {
          ...previous,
          tasks: previous.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  isCompleted,
                  // Kept in step with the server's own rule, so the optimistic
                  // row lands in the same group the refetch will put it in.
                  completedAt: isCompleted ? new Date().toISOString() : null,
                }
              : task,
          ),
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: refresh,
  });

  const snapshot = query.data;

  return {
    tasks: snapshot?.tasks ?? [],
    /**
     * Before the first fetch lands there is no authoritative day yet. Callers
     * only read this alongside `tasks`, which is empty until then, so the empty
     * string never reaches arithmetic that shows on screen.
     */
    today: snapshot?.today ?? "",
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,
    setTaskCompleted: (taskId: string, isCompleted: boolean) =>
      completion.mutate({ rawInitData, taskId, isCompleted }),
  };
}
