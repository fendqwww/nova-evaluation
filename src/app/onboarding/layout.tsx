import type { ReactNode } from "react";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeScript } from "@/components/theme-script";

// h-dvh, not min-h-dvh: onboarding is a fixed-height, never-scrolling
// surface, and the flex chain below needs a *definite* height to
// distribute — with only a minimum, every flex-1 inside resolves to
// content height and the screens collapse toward the top.
//
// Providers are mounted here rather than in the root layout: onboarding reads
// the Telegram launch params, but the public marketing pages must not be held
// behind the Mini App SDK.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {/* Тот же предпаинт, что и в (app): человек, вернувшийся в онбординг из
          приложения, не должен по дороге увидеть чужую тему. */}
      <ThemeScript />
      <TelegramProvider>
        <div className="h-dvh overflow-hidden bg-background">{children}</div>
      </TelegramProvider>
    </QueryProvider>
  );
}
