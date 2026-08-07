"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { TELEGRAM_SUPPORT_URL } from "../constants";
import { AppMockup } from "./app-mockup";
import { CtaButton } from "./cta-button";
import { Glow } from "./section";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The hero.
 *
 * Two columns on desktop, stacked on mobile with the copy first — a visitor on
 * a phone should read the promise before scrolling into the device shot.
 * Entrance is on mount (not on scroll): this block is already in view.
 */
export function HeroSection() {
  const reduced = useReducedMotion();

  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.85, delay, ease: EASE },
        };

  return (
    <section id="top" className="relative overflow-hidden px-5 pt-32 pb-20 sm:px-8 sm:pt-40 sm:pb-28 lg:px-10 lg:pt-48 lg:pb-36">
      {/* Ambient field. Two lights, purple high-left and blue low-right, so the
          gradient has direction instead of sitting as a flat wash. */}
      <div aria-hidden className="nova-grid pointer-events-none absolute inset-0" />
      <Glow tone="purple" className="nova-animate-breathe -top-32 -left-40 h-[42rem] w-[42rem] opacity-45" />
      <Glow tone="blue" className="top-40 -right-52 h-[38rem] w-[38rem] opacity-35" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        {/* Copy */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div {...rise(0)}>
            <span className="nova-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.75rem] font-medium tracking-[-0.005em] text-(--nova-text-muted)">
              <Sparkles className="h-3.5 w-3.5 text-(--nova-purple-bright)" />
              AI-система здоровья и привычек
            </span>
          </motion.div>

          <motion.h1
            {...rise(0.08)}
            className="nova-display mt-7 text-white"
          >
            NOVA
          </motion.h1>

          <motion.p
            {...rise(0.16)}
            className="nova-h2 mt-4 max-w-[16ch] text-white lg:max-w-[18ch]"
          >
            твоя <span className="nova-gradient-text">персональная</span> система развития
          </motion.p>

          <motion.p {...rise(0.24)} className="nova-lead mt-7 max-w-[46ch]">
            NOVA анализирует твой сон, питание, тренировки и привычки, чтобы помочь тебе
            становиться лучше каждый день.
          </motion.p>

          <motion.div
            {...rise(0.32)}
            className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
          >
            <CtaButton href={TELEGRAM_SUPPORT_URL} external className="w-full sm:w-auto">
              Начать бесплатно
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </CtaButton>
            <CtaButton href="#how" variant="secondary" className="w-full sm:w-auto">
              Узнать больше
            </CtaButton>
          </motion.div>

          {/* Quiet proof line — four words, no fake numbers. */}
          <motion.div
            {...rise(0.4)}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.8125rem] text-(--nova-text-subtle) lg:justify-start"
          >
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-(--nova-purple)" />
              Сон
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-[#0d9488]" />
              Питание
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-(--nova-blue)" />
              Тренировки
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-[#c98500]" />
              Привычки
            </span>
          </motion.div>
        </div>

        {/* Device */}
        <div className="relative lg:pl-4">
          <div className={reduced ? undefined : "nova-animate-float"}>
            <AppMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
