import type { ReactNode } from "react";
import Link from "next/link";
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
        "fixed inset-x-0 bottom-0 z-40 h-[var(--bottom-nav-height)] border-t border-border bg-background/80 backdrop-blur-md",
        "pb-[var(--app-safe-bottom)]",
        className,
      )}
    >
      <ul className="mx-auto flex h-full max-w-lg items-center justify-around">
        {items.map((item) => (
          <li key={item.key} className="flex-1">
            <Link
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors duration-200",
                item.isActive
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
