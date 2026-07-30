"use client";

import { Button } from "@/shared/ui/button";

export function TelegramAuthError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-8 text-center">
      <h1 className="text-title text-foreground">Не удалось войти</h1>
      <p className="max-w-xs text-caption text-muted-foreground">
        Откройте Nova через Telegram, чтобы продолжить.
      </p>
      <Button onClick={onRetry} variant="secondary">
        Повторить
      </Button>
    </div>
  );
}
