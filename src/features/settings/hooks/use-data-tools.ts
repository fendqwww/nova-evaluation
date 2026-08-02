"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { exportDataAction } from "@/features/settings/server/export-data.action";
import {
  clearDataAction,
  getClearCountsAction,
} from "@/features/settings/server/clear-data.action";
import { settingsQueryKey } from "@/features/settings/hooks/use-settings";
import { archiveQueryKey } from "@/features/settings/hooks/use-archive";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { ClearScope } from "@/features/settings/types";

export function clearCountsQueryKey(rawInitData: string | undefined) {
  return ["settings", "clear-counts", rawInitData] as const;
}

/**
 * Export and clearing — the two operations under Данные.
 *
 * Kept out of useSettings because neither one touches the settings row, and
 * both are heavy: the export walks every table the user owns and the counts
 * walk six of them. Bundling them into the screen's main query would make
 * opening Настройки as expensive as the rarest thing you can do there.
 *
 * The counts query is gated on the dialog being open for the same reason the
 * archive is, and is invalidated after a clear so a second pass through the
 * dialog shows zero rather than the number that was just deleted.
 */
export function useDataTools(countsEnabled: boolean) {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();

  const counts = useQuery({
    queryKey: clearCountsQueryKey(rawInitData),
    queryFn: () => getClearCountsAction(rawInitData),
    enabled: countsEnabled,
  });

  const exportData = useMutation({ mutationFn: exportDataAction });

  const clear = useMutation({
    mutationFn: clearDataAction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clearCountsQueryKey(rawInitData) });
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey(rawInitData) });
      void queryClient.invalidateQueries({ queryKey: archiveQueryKey(rawInitData) });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
      // Every section that could have lost rows. Same broad invalidation the
      // archive does, and for the same reason: clearing history is rare, and
      // guessing which screen the user opens next is not worth being clever
      // about. "coach" and "tasks" are in the list because those two scopes
      // exist; "goals" is not, because nothing here deletes a goal. "profile"
      // is, because its lifetime totals and achievements are counts over
      // exactly the rows a clear removes.
      for (const section of [
        "habits",
        "tasks",
        "workouts",
        "nutrition",
        "appearance",
        "coach",
        "profile",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [section] });
      }
    },
  });

  return {
    counts: counts.data ?? null,
    isCountsPending: counts.isPending && countsEnabled,

    runExport: () => exportData.mutateAsync(rawInitData),
    isExporting: exportData.isPending,
    exportError: exportData.isError,

    clearScope: (scope: ClearScope, expected: number) =>
      clear.mutateAsync({ rawInitData, scope, expected }),
    isClearing: clear.isPending,
  };
}
