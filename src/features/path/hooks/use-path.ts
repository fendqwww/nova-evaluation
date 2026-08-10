"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getPath } from "@/features/path/server/get-path.action";
import { setPathStepDoneAction } from "@/features/path/server/set-step-done.action";
import { createPathAction } from "@/features/path/server/create-path.action";
import { finishPathAction } from "@/features/path/server/finish-path.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import { profileQueryKey } from "@/features/profile/hooks/use-profile-overview";
import type { PathDraft } from "@/features/path/schemas";
import type { PathSnapshot } from "@/features/path/types";

export function pathQueryKey(rawInitData: string | undefined) {
  return ["path", rawInitData] as const;
}

/**
 * Путь и три действия над ним.
 *
 * Отметка шага — оптимистичная: это единственное действие, которое человек
 * повторяет, и ожидание сервера на каждом флажке превратило бы список шагов в
 * форму. Создание и завершение живут в модалках, где короткое ожидание честно, —
 * они просто инвалидируют кэш по успеху, как это делает useGoals.
 *
 * refresh() задевает главный экран и профиль: путь показан на всех трёх, и
 * закрытый шаг обязан исчезнуть из карточки «Мой путь» на главной, а не остаться
 * там до перезагрузки. Кода этих экранов это не касается — используются только
 * ключи, которые они уже экспортируют.
 */
export function usePath() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = pathQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getPath(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
    void queryClient.invalidateQueries({ queryKey: profileQueryKey(rawInitData) });
  }

  const stepCompletion = useMutation({
    mutationFn: setPathStepDoneAction,
    onMutate: async ({ stepId, isDone }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PathSnapshot>(key);

      if (previous?.path) {
        queryClient.setQueryData<PathSnapshot>(key, {
          ...previous,
          path: {
            ...previous.path,
            steps: previous.path.steps.map((step) =>
              step.id === stepId ? { ...step, isDone } : step,
            ),
          },
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: refresh,
  });

  const creation = useMutation({
    mutationFn: createPathAction,
    onSuccess: refresh,
  });

  const finishing = useMutation({
    mutationFn: finishPathAction,
    onSuccess: refresh,
  });

  return {
    snapshot: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,

    setStepDone: (stepId: string, isDone: boolean) =>
      stepCompletion.mutate({ rawInitData, stepId, isDone }),

    createPath: (draft: PathDraft) => creation.mutateAsync({ rawInitData, draft }),
    isCreating: creation.isPending,

    finishPath: (pathId: string, outcome: "completed" | "archived") =>
      finishing.mutateAsync({ rawInitData, pathId, outcome }),
    isFinishing: finishing.isPending,
  };
}
