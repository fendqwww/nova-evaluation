"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";

/**
 * Отметка согласия.
 *
 * Отдельный примитив, а не Switch: переключатель означает «включить функцию» и
 * имеет состояние по умолчанию, а отметка означает «я подтверждаю» и по
 * умолчанию не стоит никогда. Для юридического экрана это не оформление — не
 * проставленная заранее отметка является требованием к форме согласия, и
 * компонент, у которого нет способа отрендериться заранее отмеченным без явного
 * `checked`, делает это требование техническим свойством, а не договорённостью.
 *
 * Вся строка — одна кнопка: попасть в квадрат 20×20 пальцем на телефоне трудно,
 * а промах по согласию читается как «приложение не даёт продолжить».
 */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  hint,
  footnote,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  /** Ссылки на документы — вне кнопки, чтобы тап по ссылке не менял отметку. */
  footnote?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          haptics.selection();
          onCheckedChange(!checked);
        }}
        className={cn(
          "press-sm flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors duration-200",
          "bg-fill-subtle active:bg-fill-muted",
          disabled && "opacity-50",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
            checked
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border-strong bg-transparent",
          )}
        >
          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>

        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-caption text-foreground">{label}</span>
          {hint && <span className="text-micro text-subtle-foreground">{hint}</span>}
        </span>
      </button>

      {footnote && <div className="pl-11 text-micro">{footnote}</div>}
    </div>
  );
}
