"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";
import { sceneContainer, sceneItem } from "@/features/onboarding/components/scene-motion";

/**
 * The opening screen. No back button, no progress, no question — a centred,
 * quiet brand moment with the CTA anchored to the bottom edge, the way
 * Calm/Headway open a flow.
 *
 * The closing screen deliberately does *not* reuse this: it ends on
 * StatementScene with a recap, because a summary of what Nova heard is a
 * stronger finish than a second centred logo.
 */
export function BrandMoment({
  icon,
  title,
  subtitle,
  footer,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  footer: ReactNode;
}) {
  return (
    <motion.div
      variants={sceneContainer}
      initial="hidden"
      animate="show"
      className="mx-auto flex h-full w-full max-w-lg flex-col px-6 pb-[max(1.5rem,var(--app-safe-bottom))] pt-[max(1.25rem,var(--app-safe-top))]"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <motion.div
          variants={sceneItem}
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-[1.375rem]",
            "bg-accent text-accent-foreground shadow-[0_10px_28px_-10px_var(--accent)]",
          )}
        >
          {icon}
        </motion.div>

        <motion.div variants={sceneItem} className="flex flex-col gap-4">
          <h1 className="text-scene text-foreground">{title}</h1>
          <p className="max-w-[28ch] text-lead text-lead-foreground">{subtitle}</p>
        </motion.div>
      </div>

      <motion.div variants={sceneItem} className="mt-8">
        {footer}
      </motion.div>
    </motion.div>
  );
}
