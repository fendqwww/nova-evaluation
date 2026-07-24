"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getDashboardData } from "@/features/dashboard/server/get-dashboard-data.action";

export function dashboardQueryKey(rawInitData: string | undefined) {
  return ["dashboard", rawInitData] as const;
}

export function useDashboardData() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dashboardQueryKey(rawInitData),
    queryFn: () => getDashboardData(rawInitData!),
    enabled: !!rawInitData,
  });

  function refresh() {
    if (rawInitData) {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
    }
  }

  return { ...query, refresh };
}
