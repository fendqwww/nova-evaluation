"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getReports } from "@/features/reports/server/get-reports.action";
import { generateReportsAiSummaryAction } from "@/features/reports/server/generate-reports-ai-summary.action";

export function reportsQueryKey(rawInitData: string | undefined) {
  return ["reports", rawInitData] as const;
}

/**
 * The Reports snapshot, plus the on-demand AI summary upgrade.
 *
 * The upgrade is never automatic — it spends real AI budget (see
 * generate-reports-ai-summary.action.ts), so it only runs when
 * ReportsAiSummaryCard's button is tapped, the same opt-in rule the food
 * photo scanner follows.
 */
export function useReports() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = reportsQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getReports(rawInitData),
  });

  const aiSummary = useMutation({
    mutationFn: () => generateReportsAiSummaryAction({ rawInitData }),
    onSuccess: () => {
      // Usage moved — the limit shown elsewhere on the card must reflect it.
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    reports: query.data,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),

    generateAiSummary: () => aiSummary.mutateAsync(),
    isGeneratingAiSummary: aiSummary.isPending,
  };
}
