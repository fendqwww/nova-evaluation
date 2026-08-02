"use client";

import dynamic from "next/dynamic";
import { SubscriptionView } from "@/features/settings/components/subscription-view";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";

const SessionBoundary = dynamic(
  () =>
    import("@/features/auth/components/session-boundary").then(
      (mod) => mod.SessionBoundary,
    ),
  { ssr: false, loading: () => <AppLoadingScreen /> },
);

export default function SubscriptionPage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => !session.onboardingCompleted}
      redirectTo="/onboarding"
    >
      {() => <SubscriptionView />}
    </SessionBoundary>
  );
}
