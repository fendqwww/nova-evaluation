"use client";

import { useEffect, useState, type ReactNode } from "react";
import { init, isTMA, mockTelegramEnv, miniApp, viewport } from "@tma.js/sdk-react";
import { getDevMockInitData } from "@/server/auth/dev-mock";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";

const APP_BACKGROUND = "#09090b";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Сколько ждать ответа клиента Telegram на запросы mount.
 *
 * Секунда — это заметно больше, чем занимает ответ у клиента, который вообще
 * отвечает (десятки миллисекунд), и заметно меньше, чем терпит человек,
 * смотрящий на загрузочный экран.
 */
const MOUNT_TIMEOUT_MS = 1000;

/** Отклонить обещание, если оно не завершилось за отведённое время. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TELEGRAM_MOUNT_TIMEOUT")), ms),
    ),
  ]);
}

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
          // ВАЖНО: с таймаутом, а не просто в try/catch.
          //
          // Здесь приложение переставало запускаться в Telegram Web на
          // компьютере. `miniApp.mount()` и `viewport.mount()` спрашивают
          // клиент через postMessage и ждут ответа — а веб-клиент на часть
          // запросов не отвечает вовсе (не отклоняет, а молчит). Promise.all
          // при этом не отклоняется, а зависает навсегда: catch не срабатывает,
          // finally не выполняется, setIsReady никогда не вызывается — и
          // пользователь смотрит на бесконечный загрузочный экран. На телефоне
          // клиент отвечает, поэтому там всё работало.
          //
          // Таймаут превращает молчание в обычную неудачу. Всё, что ниже, —
          // косметика (цвет шапки, CSS-переменные вьюпорта); приложение
          // полностью работоспособно и без неё, поэтому ждать её дольше
          // секунды незачем.
          await withTimeout(Promise.all([miniApp.mount(), viewport.mount()]), MOUNT_TIMEOUT_MS);
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
          //
          // miniApp.ready() зовётся ещё раз в обход неудачного mount: это
          // сигнал «можно убирать заставку», и без него Telegram Web оставляет
          // свой спиннер поверх уже отрисованного приложения.
          try {
            miniApp.ready();
          } catch {
            // Клиент не поддерживает и этого — значит, заставки тоже нет.
          }
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
