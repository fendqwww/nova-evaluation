"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export interface BottomNavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  isActive?: boolean;
}

export interface BottomNavigationProps {
  items: BottomNavigationItem[];
  className?: string;
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-4 z-40 mx-auto max-w-lg rounded-2xl border border-border bg-surface-1/75 backdrop-blur-xl",
        "shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]",
        className,
      )}
      style={{ bottom: "calc(var(--app-safe-bottom) + 0.75rem)" }}
    >
      <ul className="flex items-center justify-around px-1.5 py-2">
        {items.map((item) => (
          <li key={item.key} className="relative flex-1">
            <Link
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors duration-200",
                item.isActive ? "text-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.isActive && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-accent-muted"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
