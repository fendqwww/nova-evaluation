"use client";

import Image from "next/image";
import { exerciseVisual } from "@/features/workouts/lib/exercise-visual";
import { MuscleMap } from "@/features/workouts/components/muscle-map";
import { cn } from "@/shared/lib/cn";

/**
 * Как выглядит упражнение — снимок движения, а когда его нет, схема работающих
 * мышц.
 *
 * ПОЧЕМУ ЕСТЬ ВТОРОЙ ВАРИАНТ, А НЕ ПРОСТО КАРТИНКА. Название упражнения здесь —
 * свободная строка: справочник закрывает частые движения, но человек пишет и
 * свои. Значит, часть названий не совпадёт ни с одним снимком никогда. Пустая
 * рамка на их месте читалась бы как незагрузившаяся картинка, то есть как
 * поломка.
 *
 * ПОЧЕМУ СХЕМА, А НЕ ПОДПИСЬ. Здесь была серая плашка со словом «Ноги» — и она
 * дублировала подпись, которая в списке стоит прямо под названием. Два раза
 * одно и то же слово вместо изображения — это и есть заглушка. Схема отвечает
 * на тот же вопрос картинкой: в списке из тридцати строк группу мышц видно
 * раньше, чем прочитано название. Разбор — в MuscleMap.
 *
 * Снимки лежат в /public/exercises штриховыми, на сплошном белом фоне. Раньше
 * под них подкладывалась белая плашка — иначе фон картинки всё равно был бы
 * белым, — и в тёмном списке получался ряд светящихся квадратов. Теперь фон
 * снимается фильтром (класс exercise-art, разбор в globals.css), поэтому снимок
 * и схема лежат на одной и той же поверхности и список выглядит однородным.
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

  // Одна и та же ячейка для снимка и для схемы. Раньше они отличались: у
  // снимка была белая подложка, у схемы — тёмная, и список из тридцати строк
  // шёл в шахматном порядке светлыми и тёмными квадратами. Общая поверхность —
  // единственное, при чём список читается как список.
  const tile = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 ring-1 ring-inset ring-border",
    box,
    className,
  );

  if (visual.image === null) {
    return (
      <div
        className={cn(tile, size === "sm" ? "p-1" : "p-1.5")}
        aria-label={`${name} — ${visual.label}`}
        role="img"
      >
        {/* Схема нарисована в пропорции 100×160 — вертикаль человека, поэтому
            высота ведущая, а ширина следует за ней. */}
        <MuscleMap group={visual.group} className="h-full w-auto" />
      </div>
    );
  }

  return (
    <div className={tile}>
      <Image
        src={visual.image}
        alt={`${name} — ${visual.label}`}
        width={pixels}
        height={pixels}
        // exercise-art снимает белый фон исходника и переворачивает штрих под
        // тёмную тему — разбор в globals.css.
        className="exercise-art h-full w-full object-contain"
        // Картинки маленькие и их много в списке: грузить их заранее нет
        // смысла, а вот отложить — есть.
        loading="lazy"
        unoptimized
      />
    </div>
  );
}
