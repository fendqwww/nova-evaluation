"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getAcademy } from "@/features/academy/server/get-academy.action";
import { setLessonCompletedAction } from "@/features/academy/server/set-lesson-completed.action";

export function academyQueryKey(rawInitData: string | undefined) {
  return ["academy", rawInitData] as const;
}

/**
 * Прогресс Академии и отметка урока.
 *
 * Отметка оптимистична: человек нажимает «Прочитал» сразу после текста, и
 * ожидание сервера в этот момент читается как «кнопка не сработала». Кэш меняется
 * первым и откатывается при ошибке — тот же приём, что у отметки привычки.
 *
 * Дашборд здесь не инвалидируется: уроки не участвуют в NOVA Score и ни в одном
 * показателе главного экрана. Академия — обучение, а не поведение, и начислять за
 * прочитанное очки означало бы платить за чтение, а не за действие.
 */
export function useAcademy() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = academyQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getAcademy(rawInitData),
  });

  const completion = useMutation({
    mutationFn: setLessonCompletedAction,
    onMutate: async ({ lessonId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);

      queryClient.setQueryData<string[]>(key, (current) => {
        const list = current ?? [];
        if (isCompleted) return list.includes(lessonId) ? list : [...list, lessonId];
        return list.filter((id) => id !== lessonId);
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    completedIds: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    setCompleted: (lessonId: string, isCompleted: boolean) =>
      completion.mutate({ rawInitData, lessonId, isCompleted }),
  };
}
