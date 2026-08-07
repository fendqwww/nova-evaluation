"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/shared/lib/cn";

/**
 * The landing's one entrance animation.
 *
 * Distinct from the app's `shared/ui/reveal` on purpose: that one fires on
 * mount, because an app screen is already in view when it renders. A marketing
 * page is a long scroll, so everything here triggers on entering the viewport
 * and only once — content that re-animates every time you scroll past it reads
 * as a demo, not as a product.
 */

const DISTANCE = 18;

export const revealContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const revealItem: Variants = {
  hidden: { opacity: 0, y: DISTANCE },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Motion is stripped, not merely shortened, when the OS asks for less of it. */
const staticVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "ul" | "li" | "header" | "footer";
}

export function Reveal({ children, className, as = "div" }: RevealProps) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      variants={reduced ? staticVariants : revealContainer}
      initial="hidden"
      whileInView="show"
      // -12% keeps an element from animating while it is still a sliver at the
      // bottom edge; `once` means a section settles and stays settled.
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      className={className}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "h2" | "p" | "span";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  return (
    <Component variants={reduced ? staticVariants : revealItem} className={cn(className)}>
      {children}
    </Component>
  );
}
