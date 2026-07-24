"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTelegramSession } from "@/features/auth/hooks/use-telegram-session";
import { TelegramAuthError } from "@/features/auth/components/auth-status-screens";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";
import type { ResolvedSession } from "@/features/auth/server/resolve-session.action";

interface SessionBoundaryProps {
  redirectWhen: (session: ResolvedSession) => boolean;
  redirectTo: string;
  children: (session: ResolvedSession) => ReactNode;
}

export function SessionBoundary({
  redirectWhen,
  redirectTo,
  children,
}: SessionBoundaryProps) {
  const router = useRouter();
  const { data, isPending, isError, refetch } = useTelegramSession();

  const shouldRedirect = !!data && redirectWhen(data);

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(redirectTo);
    }
  }, [shouldRedirect, redirectTo, router]);

  const themeColor = data?.profile?.themeColor;
  useEffect(() => {
    if (themeColor) {
      document.documentElement.dataset.theme = themeColor;
    }
  }, [themeColor]);

  if (isError) {
    return <TelegramAuthError onRetry={() => refetch()} />;
  }

  if (isPending || !data || shouldRedirect) {
    return <AppLoadingScreen />;
  }

  return <>{children(data)}</>;
}
