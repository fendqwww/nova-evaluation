"use client";

import dynamic from "next/dynamic";
import { ThemePicker } from "@/features/profile/components/theme-picker";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";
import { PageContainer } from "@/shared/ui/page-container";
import { DEFAULT_THEME, type ThemeValue } from "@/shared/config/themes";

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

export default function ProfilePage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => !session.onboardingCompleted}
      redirectTo="/onboarding"
    >
      {(session) => (
        <PageContainer className="flex flex-col gap-7">
          <header className="flex flex-col gap-1">
            <h1 className="text-title text-foreground">Профиль</h1>
            <p className="text-caption text-muted-foreground">
              {session.profile?.name ?? "Nova"}
            </p>
          </header>

          <ThemePicker
            current={(session.profile?.themeColor as ThemeValue) ?? DEFAULT_THEME}
          />
        </PageContainer>
      )}
    </SessionBoundary>
  );
}
