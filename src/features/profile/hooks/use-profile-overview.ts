"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getProfileOverview } from "@/features/profile/server/get-profile-overview.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";

export function profileQueryKey(rawInitData: string | undefined) {
  return ["profile", rawInitData] as const;
}

/**
 * The profile snapshot. Read-only by design.
 *
 * There is deliberately no mutation here. Everything on this screen is either
 * derived (score, streak, totals, achievements) or owned by another feature —
 * the accent colour writes through features/profile/server/update-theme.action,
 * the weight through log-weight.action, and the profile fields themselves are
 * edited by re-running onboarding. A second write path over the same Profile row
 * is exactly how two screens end up disagreeing about what the user is called.
 *
 * refresh() задевает и главный экран: записанный вес меняет прогресс пути и
 * wellness-блок NOVA Score, и оставить их в кэше со старым весом значило бы
 * показать на двух экранах два разных ответа об одном человеке. Кода дашборда это
 * не касается — используется только ключ, который он уже экспортирует.
 */
export function useProfileOverview() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = profileQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getProfileOverview(rawInitData),
  });

  return {
    overview: query.data,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
    },
  };
}
