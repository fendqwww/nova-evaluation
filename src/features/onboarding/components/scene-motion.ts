import type { Variants } from "framer-motion";

/**
 * The entrance every non-input scene shares: elements arrive one after another
 * rather than all at once, which is what makes a screen read as something
 * being said to you instead of a page being rendered. Shared so the welcome
 * moment, Nova's replies and the closing recap all breathe at one rhythm.
 */
export const sceneContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const sceneItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
};
