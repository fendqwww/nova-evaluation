"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { ProfileView } from "@/features/profile/components/profile-view";
import { DEFAULT_THEME } from "@/shared/config/themes";

export default function ProfilePage() {
  return (
    <AppScreen>
      {/* The accent colour comes from the session rather than from the profile
          snapshot: it lives on Profile, AppScreen already applies it on every
          load, and the picker writes back through the session's own cache.
          Reading it from a second fetch would give the app two answers to one
          question. */}
      {(session) => (
        <ProfileView themeColor={session.profile?.themeColor ?? DEFAULT_THEME} />
      )}
    </AppScreen>
  );
}
