"use client";

import dynamic from "next/dynamic";
import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";

// useRawInitData() reads window/sessionStorage synchronously on first
// render — it can never run during Next's server-side prerender pass, so
// this whole subtree is loaded client-only.
const SessionBoundary = dynamic(
  () =>
    import("@/features/auth/components/session-boundary").then(
      (mod) => mod.SessionBoundary,
    ),
  { ssr: false, loading: () => <AppLoadingScreen /> },
);

export default function OnboardingPage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => session.onboardingCompleted}
      redirectTo="/"
    >
      {(session) => <OnboardingFlow session={session} />}
    </SessionBoundary>
  );
}
