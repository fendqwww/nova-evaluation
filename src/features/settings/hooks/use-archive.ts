"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getArchiveAction } from "@/features/settings/server/get-archive.action";
import {
  deleteArchivedAction,
  restoreArchivedAction,
} from "@/features/settings/server/restore-archived.action";
import { settingsQueryKey } from "@/features/settings/hooks/use-settings";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { ArchiveKind } from "@/features/settings/types";

export function archiveQueryKey(rawInitData: string | undefined) {
  return ["settings", "archive", rawInitData] as const;
}

/**
 * The cross-section archive.
 *
 * `enabled` is what keeps this off the settings screen's critical path: the
 * query only runs once the modal is actually open, so a user who never looks
 * at the archive never pays for four table scans.
 *
 * Restoring invalidates broadly on purpose. An un-archived habit reappears on
 * the Habits screen, in the Dashboard's counters and in the Life Score, and
 * this hook has no way of knowing which of those the user will look at next —
 * so every section's cache is dropped rather than surgically patched. It
 * happens at most a handful of times in an account's life, which is exactly the
 * kind of operation that should be simple rather than clever.
 */
export function useArchive(enabled: boolean) {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = archiveQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getArchiveAction(rawInitData),
    enabled,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: settingsQueryKey(rawInitData) });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
    // The sections the restored row belongs to, plus Профиль, whose counters
    // and achievements are derived from exactly these rows. Keys are prefixes,
    // so this matches ["habits", rawInitData] and friends without importing
    // five hooks.
    for (const section of ["habits", "workouts", "nutrition", "appearance", "profile"]) {
      void queryClient.invalidateQueries({ queryKey: [section] });
    }
  }

  const restore = useMutation({ mutationFn: restoreArchivedAction, onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteArchivedAction, onSuccess: refresh });

  return {
    items: query.data ?? [],
    isPending: query.isPending && enabled,
    isError: query.isError,
    retry: () => void query.refetch(),

    restore: (kind: ArchiveKind, id: string) =>
      restore.mutateAsync({ rawInitData, kind, id }),
    remove: (kind: ArchiveKind, id: string) => remove.mutateAsync({ rawInitData, kind, id }),
    isWorking: restore.isPending || remove.isPending,
  };
}
