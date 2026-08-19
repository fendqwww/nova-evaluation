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
 * Выбор акцентного цвета. Применяется оптимистично — весь смысл такого выбора в
 * том, что интерфейс меняется под пальцем, — и откатывается, если запись не
 * прошла, чтобы экран никогда не расходился с базой.
 *
 * ЖИВЁТ В НАСТРОЙКАХ, А НЕ НА ПРОФИЛЕ. Раньше стоял на профиле отдельной
 * карточкой, а настройки на него ссылались строкой «Акцентный цвет» — то есть
 * одна настройка находилась в двух местах, и ни одно из них не было тем, где её
 * ищут. Теперь она рядом со светлой/тёмной темой, в разделе «Внешний вид», где
 * ей и место.
 *
 * `withHeading` — потому что внутри группы настроек свой заголовок уже есть, а
 * на отдельном экране его не было бы вовсе.
 */
export function ThemePicker({
  current,
  withHeading = true,
}: {
  current: ThemeValue;
  withHeading?: boolean;
}) {
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
      {withHeading ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-title text-foreground">Внешний вид</h2>
          <p className="text-caption text-muted-foreground">
            Акцентный цвет Nova. Влияет только на акценты — интерфейс остаётся фирменным.
          </p>
        </div>
      ) : (
        <p className="text-caption text-subtle-foreground">
          Акцентный цвет. Влияет только на акценты — интерфейс остаётся фирменным.
        </p>
      )}

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
          Не удалось сохранить тему. Попробуй ещё раз.
        </p>
      )}
    </div>
  );
}
