"use client";

import dynamic from "next/dynamic";
import { AppearanceView } from "@/features/appearance/components/appearance-view";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";

const SessionBoundary = dynamic(
  () =>
    import("@/features/auth/components/session-boundary").then(
      (mod) => mod.SessionBoundary,
    ),
  { ssr: false, loading: () => <AppLoadingScreen /> },
);

export default function AppearancePage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => !session.onboardingCompleted}
      redirectTo="/onboarding"
    >
      {() => <AppearanceView />}
    </SessionBoundary>
  );
}
