"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getSleep } from "@/features/sleep/server/get-sleep.action";
import { upsertSleepLogAction } from "@/features/sleep/server/upsert-sleep-log.action";
import { deleteSleepLogAction } from "@/features/sleep/server/delete-sleep-log.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { SleepSnapshot } from "@/features/sleep/types";
import type { SleepLogDraft } from "@/features/sleep/schemas";

export function sleepQueryKey(rawInitData: string | undefined) {
  return ["sleep", rawInitData] as const;
}

/**
 * The sleep snapshot, plus the two mutations the Сон screen needs.
 *
 * Both happen inside a modal (log form, delete confirm) where a short
 * pending state is honest, so neither is optimistic — the same choice
 * every non-instant mutation in Workouts/Nutrition makes. refresh() also
 * invalidates the Dashboard, since sleep is meant to feed the same daily
 * snapshot every other section does.
 */
export function useSleep() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = sleepQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getSleep(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  const upsert = useMutation({ mutationFn: upsertSleepLogAction, onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteSleepLogAction, onSuccess: refresh });

  const snapshot: SleepSnapshot | undefined = query.data;

  return {
    logs: snapshot?.logs ?? [],
    today: snapshot?.today ?? "",
    windowStart: snapshot?.windowStart ?? "",
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,

    upsertLog: (draft: SleepLogDraft) => upsert.mutateAsync({ rawInitData, draft }),
    deleteLog: (logId: string) => remove.mutateAsync({ rawInitData, logId }),
  };
}
