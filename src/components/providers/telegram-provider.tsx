"use client";

import { useEffect, useState, type ReactNode } from "react";
import { init, isTMA, mockTelegramEnv, miniApp, viewport } from "@tma.js/sdk-react";
import { getDevMockInitData } from "@/server/auth/dev-mock";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";

const APP_BACKGROUND = "#09090b";
const isProduction = process.env.NODE_ENV === "production";

export function TelegramProvider({ children }: { children: ReactNode }) {
  // Children (SessionBoundary in particular) read launch params on their
  // very first render. In real Telegram those are already in the URL
  // before any JS runs, but the dev mock needs an async round trip — so
  // children must not mount until this effect has had a chance to run,
  // or they'd read an empty environment and crash.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cleanup: VoidFunction | undefined;

    void (async () => {
      try {
        // Real native integration (mount/viewport/theme colors) only ever
        // runs in production. Outside of it, isTMA() can't be trusted to
        // mean "real Telegram": mockTelegramEnv() below writes its fake
        // launch params into sessionStorage, which survives page reloads
        // within the same dev session and would make isTMA() report true
        // on the next load even though there's still no real bridge to
        // talk to.
        if (!isProduction) {
          if (!isTMA()) {
            const rawInitData = await getDevMockInitData();
            mockTelegramEnv({
              launchParams: {
                tgWebAppData: rawInitData,
                tgWebAppVersion: "8",
                tgWebAppPlatform: "tdesktop",
                tgWebAppThemeParams: {},
              },
              resetPostMessage: true,
            });
          }
          return;
        }

        if (!isTMA()) return;

        cleanup = init();
        try {
          await Promise.all([miniApp.mount(), viewport.mount()]);
          miniApp.ready();
          viewport.bindCssVars();
          viewport.expand();
          miniApp.setBgColor(APP_BACKGROUND);
          miniApp.setHeaderColor(APP_BACKGROUND);
          miniApp.setBottomBarColor(APP_BACKGROUND);
        } catch {
          // Best-effort integration: older Telegram clients may not
          // support every method above. The app stays fully usable
          // without them.
        }
      } finally {
        setIsReady(true);
      }
    })();

    return () => cleanup?.();
  }, []);

  if (!isReady) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
