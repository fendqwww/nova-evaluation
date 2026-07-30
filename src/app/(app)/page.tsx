"use client";

import dynamic from "next/dynamic";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";
import { PageContainer } from "@/shared/ui/page-container";

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

export default function DashboardPage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => !session.onboardingCompleted}
      redirectTo="/onboarding"
    >
      {() => (
        <PageContainer>
          <DashboardView />
        </PageContainer>
      )}
    </SessionBoundary>
  );
}
