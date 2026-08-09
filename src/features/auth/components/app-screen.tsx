"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";
import type { ResolvedSession } from "@/features/auth/server/resolve-session.action";

/**
 * useRawInitData() reads window/sessionStorage synchronously on first render —
 * it can never run during Next's server-side prerender pass, so the whole
 * subtree is loaded client-only. Declared once here rather than re-declared at
 * the top of every route file, which is how thirteen pages ended up carrying
 * the same fifteen lines and the same comment explaining them.
 */
const SessionBoundary = dynamic(
  () =>
    import("@/features/auth/components/session-boundary").then(
      (mod) => mod.SessionBoundary,
    ),
  { ssr: false, loading: () => <AppLoadingScreen /> },
);

/**
 * The frame every signed-in screen sits in: session resolved, theme applied,
 * and anyone who has not finished onboarding sent back to finish it.
 *
 * The redirect rule is baked in rather than passed: "unfinished onboarding goes
 * to /onboarding" was the same on all thirteen routes, and a per-page prop
 * meant a new screen could silently ship without the guard. A route that ever
 * needs a different rule can still use SessionBoundary directly.
 */
export function AppScreen({
  children,
}: {
  children: (session: ResolvedSession) => ReactNode;
}) {
  return (
    <SessionBoundary
      redirectWhen={(session) => !session.onboardingCompleted}
      redirectTo="/onboarding"
    >
      {children}
    </SessionBoundary>
  );
}
