"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

/**
 * Полоска вкладок внутри раздела — одна на всё приложение.
 *
 * ЗАЧЕМ ОНА ПОЯВИЛАСЬ. Таких полосок было четыре: у тренировок, питания, сна и
 * внешности. Копии разошлись не по виду, а по поведению, и все четыре несли
 * одну и ту же ошибку: `flex-1` без `min-w-0`. Флекс-элемент не даёт себе стать
 * уже собственного текста, поэтому «Статистика» в питании — пятая подпись из
 * пяти — выталкивала полоску за край карточки, и обрезалось всё, что стояло
 * после «Продуктов». В тренировках то же самое случалось с третьей вкладкой.
 *
 * ЧТО ЗДЕСЬ РЕШАЕТ ЗАДАЧУ: `grow shrink-0 basis-auto` вместе с горизонтальной
 * прокруткой контейнера. Когда подписи помещаются — они делят свободное место и
 * полоска выглядит как обычный сегментированный контрол. Когда не помещаются —
 * лента прокручивается, а подписи остаются целыми. Обрезать подпись нельзя:
 * «Статист…» — это не название вкладки, а сообщение о поломке.
 *
 * Отступы заданы ровно один раз и здесь. Это и было главной причиной, по
 * которой четыре копии стоило свести в одну: расхождение в пару пикселей между
 * разделами глаз ловит быстрее, чем можно объяснить.
 */
export interface SegmentedTabOption<T extends string> {
  id: T;
  label: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  /**
   * Общий layoutId для скользящей плашки. Разный у каждой полоски: один и тот
   * же id заставил бы плашку «перелетать» между разделами при переключении
   * экранов.
   */
  layoutId,
  ariaLabel,
}: {
  options: ReadonlyArray<SegmentedTabOption<T>>;
  value: T;
  onChange: (id: T) => void;
  layoutId: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="glass-card flex gap-1 overflow-x-auto rounded-xl border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const isActive = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative shrink-0 grow basis-auto whitespace-nowrap rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-200",
              isActive ? "text-accent-foreground" : "text-muted-foreground active:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-lg bg-accent shadow-[0_4px_14px_-6px_var(--accent)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
