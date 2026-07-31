"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export type HealthSection = "workouts" | "nutrition";

const SECTIONS: { id: HealthSection; label: string; href: string }[] = [
  { id: "workouts", label: "Тренировки", href: "/workouts" },
  { id: "nutrition", label: "Питание", href: "/nutrition" },
];

/**
 * Switches between the two screens sharing the "Здоровье" bottom-nav tab.
 *
 * The tab bar only has room for one entry point into this area (see the note
 * in app/(app)/layout.tsx), so this is what actually moves between Тренировки
 * and Питание — same sliding-pill control as WorkoutsTabs/NutritionTabs, one
 * level up, switching pages instead of in-page tabs.
 */
export function HealthSectionTabs({ active }: { active: HealthSection }) {
  return (
    <div
      role="tablist"
      aria-label="Раздел здоровья"
      className="flex gap-1 rounded-xl border border-border bg-black/20 p-1"
    >
      {SECTIONS.map((section) => {
        const isActive = section.id === active;

        return (
          <Link
            key={section.id}
            href={section.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative flex-1 rounded-lg px-2 py-2 text-center text-caption font-medium transition-colors duration-200",
              isActive ? "text-accent-foreground" : "text-muted-foreground active:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="health-section-active"
                className="absolute inset-0 -z-10 rounded-lg bg-accent"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
