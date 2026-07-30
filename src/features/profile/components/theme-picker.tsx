"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { ThemeCard } from "@/features/profile/components/theme-card";
import { updateTheme } from "@/features/profile/server/update-theme.action";
import { sessionQueryKey } from "@/features/auth/hooks/use-telegram-session";
import { applyThemeColor } from "@/shared/lib/apply-theme";
import { THEME_OPTIONS, type ThemeValue } from "@/shared/config/themes";

/**
 * Where the accent colour lives now that it is no longer an onboarding
 * question. Applied optimistically — the whole point of an accent picker is
 * that the UI changes under your finger — and rolled back if the write fails,
 * so what's on screen never disagrees with what's stored.
 */
export function ThemePicker({ current }: { current: ThemeValue }) {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ThemeValue>(current);

  const mutation = useMutation({
    mutationFn: updateTheme,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sessionQueryKey(rawInitData) }),
  });

  function pick(themeColor: ThemeValue) {
    if (themeColor === selected) return;

    const previous = selected;
    setSelected(themeColor);
    applyThemeColor(themeColor);

    mutation.mutate(
      { rawInitData, themeColor },
      {
        onError: () => {
          setSelected(previous);
          applyThemeColor(previous);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-title text-foreground">Внешний вид</h2>
        <p className="text-caption text-muted-foreground">
          Акцентный цвет Nova. Влияет только на акценты — интерфейс остаётся фирменным.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border p-2">
        {THEME_OPTIONS.map((option) => (
          <ThemeCard
            key={option.value}
            label={option.label}
            swatch={option.swatch}
            selected={selected === option.value}
            onSelect={() => pick(option.value)}
          />
        ))}
      </div>

      {mutation.isError && (
        <p className="text-caption text-destructive">
          Не удалось сохранить тему. Попробуйте ещё раз.
        </p>
      )}
    </div>
  );
}
