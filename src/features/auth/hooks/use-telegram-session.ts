"use client";

import { useQuery } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { resolveSession } from "@/features/auth/server/resolve-session.action";

export function sessionQueryKey(rawInitData: string | undefined) {
  return ["session", rawInitData] as const;
}

export function useTelegramSession() {
  const rawInitData = useRawInitData();

  const query = useQuery({
    queryKey: sessionQueryKey(rawInitData),
    queryFn: () => resolveSession(rawInitData!),
    enabled: !!rawInitData,
  });

  return { ...query, rawInitData };
}
