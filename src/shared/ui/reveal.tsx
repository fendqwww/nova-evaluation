"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/shared/lib/cn";

/**
 * The app's one entrance animation.
 *
 * Every screen used to declare its own `containerVariants`/`itemVariants` pair
 * with slightly different distances and durations, which is why sections used
 * to arrive at visibly different speeds. These two exports are now the only
 * definition: a list staggers its children, a child rises 8px as it fades in.
 *
 * Distance and easing intentionally match the `rise-in` keyframe in globals.css
 * so a CSS-animated element and a Framer-animated one look identical.
 */
export const revealContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
};

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Staggers whatever is inside it. Children must be `<RevealItem>` (or any
 * motion element using `revealItem`) for the stagger to reach them.
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={revealContainer}
      initial="hidden"
      animate="show"
      className={cn("flex flex-col", className)}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={revealItem} className={className}>
      {children}
    </motion.div>
  );
}
