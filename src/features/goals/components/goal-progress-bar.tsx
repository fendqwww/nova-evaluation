"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

/**
 * The card's dominant element, so it is deliberately thick — a hairline bar is
 * what made the section read as a list of notes. Filled in the brand accent
 * (green once done, red once overdue), never in the purple Goal tint: per
 * globals.css the category tints stay inside icon badges.
 */
export function GoalProgressBar({
  ratio,
  fillClass,
  size = "md",
}: {
  ratio: number;
  fillClass: string;
  size?: "sm" | "md";
}) {
  const percent = Math.round(ratio * 100);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-white/8",
        size === "md" ? "h-2.5" : "h-1.5",
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <motion.div
        className={cn("h-full rounded-full", fillClass)}
        initial={false}
        animate={{ width: `${percent}%` }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      />
    </div>
  );
}
