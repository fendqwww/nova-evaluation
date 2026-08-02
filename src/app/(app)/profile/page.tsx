"use client";

import dynamic from "next/dynamic";
import { ProfileView } from "@/features/profile/components/profile-view";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";
import { DEFAULT_THEME } from "@/shared/config/themes";

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
      {/* The accent colour comes from the session rather than from the profile
          snapshot: it lives on Profile, SessionBoundary already applies it on
          every load, and the picker writes back through the session's own
          cache. Reading it from a second fetch would give the app two answers
          to one question. */}
      {(session) => (
        <ProfileView themeColor={session.profile?.themeColor ?? DEFAULT_THEME} />
      )}
    </SessionBoundary>
  );
}
