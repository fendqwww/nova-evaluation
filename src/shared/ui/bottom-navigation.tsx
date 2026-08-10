"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";

export interface BottomNavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  /**
   * Extra route prefixes that should also light up this tab, for a tab that
   * fronts more than one screen — Здоровье leads with Тренировки but also
   * covers Питание, so the tab does not go dark the moment the user switches
   * section inside it.
   */
  alsoActiveFor?: string[];
}

export interface BottomNavigationProps {
  items: BottomNavigationItem[];
  /**
   * The centre action. Rendered between items 2 and 3, raised above the bar.
   *
   * A button rather than a sixth tab because it does not navigate: logging a
   * meal or a glass of water should not cost the screen you were reading. It
   * sits in the middle because that is the one position a thumb reaches without
   * moving the phone, and because the most common act in a health app is
   * recording something — which used to be four taps deep behind a tab.
   */
  onRecord?: () => void;
  className?: string;
}

function isRouteActive(pathname: string, item: BottomNavigationItem): boolean {
  const prefixes = [item.href, ...(item.alsoActiveFor ?? [])];
  return prefixes.some((href) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));
}

export function BottomNavigation({ items, onRecord, className }: BottomNavigationProps) {
  // Active state is derived here rather than passed in, so the server layout
  // that declares the tabs never has to know the current route.
  const pathname = usePathname();

  // Split so the raised button can sit in the middle of the row rather than at
  // one end. With five tabs this is 2 + button + 3.
  const splitAt = Math.ceil(items.length / 2);
  const groups = onRecord
    ? [items.slice(0, splitAt), items.slice(splitAt)]
    : [items];

  return (
    <nav
      className={cn(
        "fixed inset-x-3 z-40 mx-auto max-w-lg rounded-2xl border glass-panel shadow-nav",
        className,
      )}
      style={{ bottom: "calc(var(--app-safe-bottom) + 0.625rem)" }}
    >
      <ul className="flex items-stretch px-1.5 py-1.5">
        {groups.map((group, groupIndex) => (
          <li key={groupIndex} className="flex flex-1 items-stretch">
            <ul className="flex flex-1 items-stretch justify-around">
              {group.map((item) => {
                const active = isRouteActive(pathname, item);

                return (
                  <li key={item.key} className="relative flex-1">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      // Только при смене вкладки. Отклик на повторное нажатие
                      // уже активной вкладки — вибрация без события, а это
                      // ровно то, от чего словарь жестов в shared/lib/haptics
                      // и защищает.
                      onClick={() => !active && haptics.selection()}
                      className={cn(
                        "press-sm relative flex flex-col items-center gap-1 rounded-xl px-1 pb-1.5 pt-2",
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
                      <span className="text-[0.625rem] font-medium leading-none tracking-[-0.005em]">
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

            {onRecord && groupIndex === 0 && (
              <div className="flex w-14 shrink-0 items-center justify-center">
                <motion.button
                  type="button"
                  onClick={() => {
                    haptics.press();
                    onRecord();
                  }}
                  aria-label="Записать"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  className="relative -mt-5 flex h-13 w-13 items-center justify-center overflow-hidden rounded-2xl bg-accent text-accent-foreground shadow-[0_8px_22px_-6px_var(--accent)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-linear-to-b before:from-white/20 before:to-transparent"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </motion.button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
