"use client";

import Image from "next/image";
import { exerciseVisual } from "@/features/workouts/lib/exercise-visual";
import { cn } from "@/shared/lib/cn";

/**
 * Как выглядит упражнение — картинка, а когда её нет, группа мышц словом.
 *
 * ПОЧЕМУ ЕСТЬ ЗАПАСНОЙ ВАРИАНТ, А НЕ ПРОСТО КАРТИНКА. Название упражнения здесь
 * — свободная строка, которую человек пишет сам, и справочника движений в
 * приложении нет. Значит, часть названий не совпадёт ни с одной иллюстрацией
 * никогда: «моё упражнение», «жим Смита под углом», опечатка. Пустая рамка на
 * их месте читалась бы как незагрузившаяся картинка, то есть как поломка.
 * Подпись с группой мышц — это ответ, а не заглушка.
 *
 * Иллюстрации лежат в /public/exercises светлыми, на белом фоне: они рисованные,
 * а не сняты на камеру, и в тёмной теме белый прямоугольник выглядел бы
 * заплаткой. Поэтому у картинки собственная светлая подложка со скруглением —
 * как у карточки товара, а не как у фотографии на всю ширину.
 */
export function ExerciseIllustration({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const visual = exerciseVisual(name);

  const box = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-32 w-32" : "h-20 w-20";
  const pixels = size === "sm" ? 48 : size === "lg" ? 128 : 80;

  if (visual.image === null) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-fill-muted text-center",
          box,
          className,
        )}
      >
        <span className="px-1 text-nano font-semibold uppercase leading-tight text-muted-foreground">
          {visual.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-border",
        box,
        className,
      )}
    >
      <Image
        src={visual.image}
        alt={`${name} — ${visual.label}`}
        width={pixels}
        height={pixels}
        className="h-full w-full object-contain"
        // Картинки маленькие и их много в списке: грузить их заранее нет
        // смысла, а вот отложить — есть.
        loading="lazy"
        unoptimized
      />
    </div>
  );
}
