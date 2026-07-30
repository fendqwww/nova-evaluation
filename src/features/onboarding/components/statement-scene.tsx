"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { sceneContainer, sceneItem } from "@/features/onboarding/components/scene-motion";

interface StatementSceneProps {
  title: ReactNode;
  body: string;
  onBack?: () => void;
  /** Optional detail block between the copy and the CTA (e.g. the recap rows). */
  children?: ReactNode;
  footer: ReactNode;
}

/**
 * A scene where Nova talks and the user only listens — no input, no choices.
 *
 * The third of three compositions in the flow, and the one that makes it a
 * conversation: StepShell asks, BrandMoment brands, this one answers. It is
 * deliberately built to *not* resemble StepShell — copy sits optically centred
 * instead of pinned under a header, and the "NOVA" mark names the speaker — so
 * that arriving here feels like a change of turn rather than the next field.
 */
export function StatementScene({
  title,
  body,
  onBack,
  children,
  footer,
}: StatementSceneProps) {
  return (
    <motion.div
      variants={sceneContainer}
      initial="hidden"
      animate="show"
      className="flex h-full flex-col"
    >
      <div className="flex h-10 items-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Назад"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 active:bg-white/6 active:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center pb-6">
        <motion.div variants={sceneItem} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          <span className="text-label text-muted-foreground">NOVA</span>
        </motion.div>

        <motion.h1 variants={sceneItem} className="mt-5 text-scene text-foreground">
          {title}
        </motion.h1>

        <motion.p
          variants={sceneItem}
          className="mt-4 max-w-[32ch] text-lead text-lead-foreground"
        >
          {body}
        </motion.p>

        {children && (
          <motion.div variants={sceneItem} className="mt-9">
            {children}
          </motion.div>
        )}
      </div>

      <motion.div variants={sceneItem}>{footer}</motion.div>
    </motion.div>
  );
}
