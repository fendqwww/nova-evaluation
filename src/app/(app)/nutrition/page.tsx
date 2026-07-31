"use client";

import dynamic from "next/dynamic";
import { NutritionView } from "@/features/nutrition/components/nutrition-view";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";

const SessionBoundary = dynamic(
  () =>
    import("@/features/auth/components/session-boundary").then(
      (mod) => mod.SessionBoundary,
    ),
  { ssr: false, loading: () => <AppLoadingScreen /> },
);

export default function NutritionPage() {
  return (
    <SessionBoundary
      redirectWhen={(session) => !session.onboardingCompleted}
      redirectTo="/onboarding"
    >
      {() => <NutritionView />}
    </SessionBoundary>
  );
}
