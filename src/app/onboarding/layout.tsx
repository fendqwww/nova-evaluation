import type { ReactNode } from "react";

// h-dvh, not min-h-dvh: onboarding is a fixed-height, never-scrolling
// surface, and the flex chain below needs a *definite* height to
// distribute — with only a minimum, every flex-1 inside resolves to
// content height and the screens collapse toward the top.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="h-dvh overflow-hidden bg-background">{children}</div>;
}
