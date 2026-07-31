"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

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
  className?: string;
}

function isRouteActive(pathname: string, item: BottomNavigationItem): boolean {
  const prefixes = [item.href, ...(item.alsoActiveFor ?? [])];
  return prefixes.some((href) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  // Active state is derived here rather than passed in, so the server layout
  // that declares the tabs never has to know the current route.
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-3 z-40 mx-auto max-w-lg rounded-2xl border border-white/9 glass-panel shadow-nav",
        className,
      )}
      style={{ bottom: "calc(var(--app-safe-bottom) + 0.625rem)" }}
    >
      <ul className="flex items-stretch justify-around px-1.5 py-1.5">
        {items.map((item) => {
          const active = isRouteActive(pathname, item);

          return (
            <li key={item.key} className="relative flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl px-1 pb-1.5 pt-2 transition-colors duration-200",
                  active ? "text-accent" : "text-subtle-foreground active:text-foreground",
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
                <span className="flex h-5 items-center justify-center">{item.icon}</span>
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
    </nav>
  );
}
