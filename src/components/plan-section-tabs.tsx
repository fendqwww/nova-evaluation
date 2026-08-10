"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";

export type PlanSection = "goals" | "habits" | "tasks";

const SECTIONS: { id: PlanSection; label: string; href: string }[] = [
  { id: "goals", label: "Цели", href: "/goals" },
  { id: "habits", label: "Привычки", href: "/habits" },
  { id: "tasks", label: "Задачи", href: "/tasks" },
];

/**
 * Switches between the three screens sharing the "План" bottom-nav tab.
 *
 * Deliberately the same quiet underlined strip HealthSectionTabs uses, and for
 * the same reason: the pill-shaped in-page tabs each screen renders below this
 * one are the loud "what am I looking at" control, and two filled controls
 * stacked back to back read as one confusing control with too many buttons.
 * This one is the quiet "where in the app am I" wayfinding.
 *
 * It exists because Цели, Привычки and Задачи used to hold three of seven
 * bottom-nav slots in what is now a health product. They kept every route and
 * every feature; only their depth changed.
 */
export function PlanSectionTabs({ active }: { active: PlanSection }) {
  return (
    <div role="tablist" aria-label="Раздел плана" className="flex items-stretch gap-5">
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
              "press-sm relative flex flex-col items-center gap-1.5 pb-2 pt-0.5 text-caption font-medium",
              isActive
                ? "text-foreground"
                : "text-subtle-foreground active:text-muted-foreground",
            )}
          >
            {section.label}
            {isActive && (
              <motion.span
                layoutId="plan-section-active"
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
