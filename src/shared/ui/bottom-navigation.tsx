"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";

export interface BottomNavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  /**
   * Extra route prefixes that should also light up this tab, for a tab that
   * genuinely fronts more than one screen — Профиль leads with itself but also
   * covers Путь, Академия, Библиотека и Настройки, which have no tab of their
   * own and are reached only from it.
   *
   * ЭТО НЕ СПОСОБ ПРИСТРОИТЬ БЕСХОЗНЫЙ ЭКРАН. Подсветка отвечает на вопрос «где
   * я сейчас», поэтому сюда попадает только то, что человек действительно
   * открыл из этой вкладки. Сон и Внешность открываются полоской
   * HealthSectionTabs, а не из Профиля, и поэтому не подсвечивают ничего — см.
   * разбор в app/(app)/layout.tsx.
   */
  alsoActiveFor?: string[];
}

export interface BottomNavigationProps {
  items: BottomNavigationItem[];
  className?: string;
}

function isRouteActive(pathname: string, item: BottomNavigationItem): boolean {
  const prefixes = [item.href, ...(item.alsoActiveFor ?? [])];
  return prefixes.some((href) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));
}

/**
 * Панель вкладок. Пять равных слотов и ничего больше.
 *
 * Здесь была центральная приподнятая кнопка записи — она ушла на главный экран
 * плитками быстрых действий, когда «Коуч» вернулся пятой вкладкой. Разбор этого
 * решения целиком лежит в app/(app)/layout.tsx, рядом с самой раскладкой;
 * компонент теперь просто рисует то, что ему передали.
 */
export function BottomNavigation({ items, className }: BottomNavigationProps) {
  // Active state is derived here rather than passed in, so the server layout
  // that declares the tabs never has to know the current route.
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-3 z-40 mx-auto max-w-lg rounded-2xl border glass-panel shadow-nav",
        className,
      )}
      style={{ bottom: "calc(var(--app-safe-bottom) + 0.625rem)" }}
    >
      {/* gap-0.5 вместо слипшихся слотов: подписи в пять символов и в десять
          стояли вплотную, и «Здоровье» с «Профилем» читались как одно слово в
          два этажа. Зазор задан здесь, а не отступами внутри слота, чтобы
          подсветка активной вкладки оставалась во всю его ширину. */}
      <ul className="flex items-stretch gap-0.5 px-1.5 py-1.5">
        {items.map((item) => {
          const active = isRouteActive(pathname, item);

          return (
            <li key={item.key} className="relative min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Только при смене вкладки. Отклик на повторное нажатие
                // уже активной вкладки — вибрация без события, а это
                // ровно то, от чего словарь жестов в shared/lib/haptics
                // и защищает.
                onClick={() => !active && haptics.selection()}
                className={cn(
                  "press-sm relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 pb-1.5 pt-2",
                  active
                    ? "text-accent"
                    : "text-subtle-foreground active:text-foreground",
                )}
              >
                {active && (
                  // One shared layoutId means the pill physically slides
                  // between tabs instead of cross-fading.
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-accent-soft ring-1 ring-inset ring-accent-border"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span
                  className="flex h-5 items-center justify-center"
                  animate={active ? { scale: 1.08 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  {item.icon}
                </motion.span>
                {/* truncate, потому что пять слотов на узком телефоне дают
                    примерно 62px на вкладку, а «Тренировки» — одно слово,
                    которое не переносится и без ограничения вылезло бы за
                    пределы своего слота на соседний. */}
                <span className="max-w-full truncate text-nano font-medium leading-none tracking-[-0.005em]">
                  {item.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="bottom-nav-dot"
                    className="absolute -bottom-0.5 h-[2.5px] w-5 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
