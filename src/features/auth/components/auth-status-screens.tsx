"use client";

import { Button } from "@/shared/ui/button";
import { TELEGRAM_APP_HANDLE } from "@/shared/config/app-bot";
import { SUPPORT_CHANNEL } from "@/shared/config/legal";

/**
 * Экран «войти не получилось».
 *
 * Раньше здесь была одна строка «Откройте Nova через Telegram» — верная ровно
 * в одном случае из трёх и бесполезная в двух остальных. Причина видна серверу
 * (initData не пришёл, подпись не сошлась, срок истёк), и она определяет, что
 * человеку делать: открыть приложение из бота, обновить страницу или проверить
 * часы на компьютере.
 *
 * Расхождение часов — не выдуманный случай. Подпись initData проверяется с
 * окном в час (см. server/auth/telegram.ts), и ноутбук, отставший на полтора,
 * получает отказ, который никакими перезапусками не лечится. На телефоне время
 * синхронизируется само, поэтому там всё работает — ровно та картина, с
 * которой начинается «на телефоне открывается, на ноуте нет».
 */
export function TelegramAuthError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-title text-foreground">Не удалось войти</h1>
        <p className="max-w-xs text-caption text-muted-foreground">
          Telegram не подтвердил вход. Обычно помогает одно из трёх:
        </p>
      </div>

      <ul className="flex max-w-xs flex-col gap-2 text-left text-caption text-muted-foreground">
        <Hint n="1">
          Откройте Nova заново из бота {TELEGRAM_APP_HANDLE} — ссылка на вход
          живёт час и могла устареть.
        </Hint>
        <Hint n="2">
          Проверьте дату и время на компьютере. Если часы отстают или спешат
          больше чем на час, Telegram не сможет подтвердить вход.
        </Hint>
        <Hint n="3">
          В браузере откройте Telegram Web заново и запустите приложение из чата
          с ботом, а не по сохранённой ссылке.
        </Hint>
      </ul>

      <div className="flex flex-col items-center gap-2">
        <Button onClick={onRetry} variant="secondary">
          Повторить
        </Button>
        <a
          href={SUPPORT_CHANNEL.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-micro text-subtle-foreground underline underline-offset-2"
        >
          Написать в поддержку
        </a>
      </div>
    </div>
  );
}

function Hint({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="numeric shrink-0 text-subtle-foreground">{n}.</span>
      <span>{children}</span>
    </li>
  );
}
