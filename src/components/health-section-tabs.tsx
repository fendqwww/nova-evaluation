"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";

export type HealthSection = "workouts" | "nutrition" | "sleep" | "appearance";

const SECTIONS: { id: HealthSection; label: string; href: string }[] = [
  { id: "workouts", label: "Тренировки", href: "/workouts" },
  { id: "nutrition", label: "Питание", href: "/nutrition" },
  { id: "sleep", label: "Сон", href: "/sleep" },
  { id: "appearance", label: "Внешность", href: "/appearance" },
];

/**
 * Switches between the four screens sharing the "Здоровье" bottom-nav tab.
 *
 * Deliberately a quieter, underlined strip rather than the filled sliding pill
 * every screen's own in-page tabs (WorkoutsTabs/NutritionTabs/SleepTabs/
 * AppearanceTabs) use one row below it — two identical bold controls stacked
 * back to back read as one confusing control with too many buttons, not two.
 * This one is the
 * quiet "where in the app am I" wayfinding; the pill below it is the loud
 * "what am I looking at" choice, and the visual gap between them is what makes
 * the screen readable at a glance.
 */
export function HealthSectionTabs({ active }: { active: HealthSection }) {
  return (
    // ПОЛОСА ПРОКРУЧИВАЕТСЯ, А НЕ СЖИМАЕТСЯ. Была `flex gap-5` без прокрутки:
    // её ширина складывалась из длины четырёх слов, «Тренировки Питание Сон
    // Внешность» требуют 351px, и на экране в 320 (iPhone SE, узкие Android)
    // «Внешность» уезжала за край, растягивая вместе с собой всю страницу —
    // вкладки ниже, карточки статистики и календарь съезжали вправо. Замер в
    // браузере: scrollWidth 351 при вьюпорте 320.
    //
    // Равные доли с `truncate` эту задачу решали хуже, чем не решали: на 320px
    // слот получается 69px при нужных 75, и центрированный текст обрезался с
    // обеих сторон — «ренировк», «нешност». Подпись, обрезанную слева, нельзя
    // прочитать вообще.
    //
    // Прокрутка — тот же приём, что у панелей фильтров в целях, привычках и
    // библиотеке: отрицательный отступ выводит ленту под край экрана, чтобы
    // обрез читался как продолжение, а не как поломка.
    <div
      role="tablist"
      aria-label="Раздел здоровья"
      className="-mx-4 flex items-stretch gap-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {SECTIONS.map((section) => {
        const isActive = section.id === active;

        return (
          <Link
            key={section.id}
            href={section.href}
            role="tab"
            aria-selected={isActive}
            onClick={() => !isActive && haptics.selection()}
            className={cn(
              "press-sm relative flex shrink-0 flex-col items-center gap-1.5 pb-2 pt-0.5 text-caption font-medium",
              isActive ? "text-foreground" : "text-subtle-foreground active:text-muted-foreground",
            )}
          >
            {section.label}
            {isActive && (
              <motion.span
                layoutId="health-section-active"
                className="absolute -bottom-px h-[2.5px] w-6 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
