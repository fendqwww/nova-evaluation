"use client";

import { useQuery } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { resolveSession } from "@/features/auth/server/resolve-session.action";

export function sessionQueryKey(rawInitData: string | undefined) {
  return ["session", rawInitData] as const;
}

export function useTelegramSession() {
  const rawInitData = useRawInitData();

  // Never gated on `rawInitData`: outside Telegram there is none, and the
  // server decides what that means (a stand-in user in development, an auth
  // failure in production) rather than the UI hanging on a spinner forever.
  const query = useQuery({
    queryKey: sessionQueryKey(rawInitData),
    queryFn: () => resolveSession(rawInitData),
  });

  return { ...query, rawInitData };
}
