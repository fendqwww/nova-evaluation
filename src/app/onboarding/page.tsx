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

// In development /onboarding always opens, even for a user whose
// onboardingCompletedAt is already set. Without this, the flow becomes
// permanently unreachable the moment you finish it once: the timestamp lands
// in prisma/dev.db and every later visit bounces straight to the Dashboard,
// with nothing on screen to explain why.
//
// Guarding the flow is still correct in production, so only the development
// build drops it. Completing onboarding navigates on its own (see finish() in
// use-onboarding-flow.ts), so switching the guard off never traps anyone on
// the final screen.
//
// To reset the underlying data instead of bypassing the check, open
// /dev/reset-onboarding.
const isDev = process.env.NODE_ENV === "development";

export default function OnboardingPage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => !isDev && session.onboardingCompleted}
      redirectTo="/"
    >
      {(session) => <OnboardingFlow session={session} />}
    </SessionBoundary>
  );
}
