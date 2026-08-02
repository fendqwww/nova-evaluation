"use client";

import dynamic from "next/dynamic";
import { SettingsView } from "@/features/settings/components/settings-view";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";

// useRawInitData() reads window/sessionStorage synchronously on first render —
// it can never run during Next's server-side prerender pass, so this whole
// subtree is loaded client-only. Same arrangement as every other app screen.
const SessionBoundary = dynamic(
  () =>
    import("@/features/auth/components/session-boundary").then(
      (mod) => mod.SessionBoundary,
    ),
  { ssr: false, loading: () => <AppLoadingScreen /> },
);

export default function SettingsPage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => !session.onboardingCompleted}
      redirectTo="/onboarding"
    >
      {() => <SettingsView />}
    </SessionBoundary>
  );
}
