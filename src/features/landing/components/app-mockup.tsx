"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Moon, Utensils, Dumbbell, Repeat, Sparkles } from "lucide-react";

const LIFE_SCORE = 82;

const RING_SIZE = 148;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface MockupPillar {
  icon: typeof Moon;
  label: string;
  value: string;
  /** 0–100, drives the mini bar fill. */
  progress: number;
  color: string;
}

const MOCKUP_PILLARS: ReadonlyArray<MockupPillar> = [
  { icon: Moon, label: "Сон", value: "7ч 40м", progress: 88, color: "#8b5cf6" },
  { icon: Utensils, label: "Питание", value: "1 840 ккал", progress: 74, color: "#0d9488" },
  { icon: Dumbbell, label: "Тренировки", value: "4 / 5", progress: 80, color: "#3b82f6" },
  { icon: Repeat, label: "Привычки", value: "12 дней", progress: 92, color: "#c98500" },
];

/**
 * A hand-built replica of the product's dashboard rather than a screenshot.
 *
 * It stays crisp at any density, restyles with the landing's palette, and can
 * animate its own numbers — which is what makes the hero feel like software
 * instead of an image of software. It is decorative: the whole block is
 * aria-hidden, and every fact it shows is stated in real text elsewhere.
 */
export function AppMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();

  const score = useMotionValue(reduced ? LIFE_SCORE : 0);
  const displayedScore = useTransform(score, (value) => Math.round(value));
  const dashOffset = useTransform(
    score,
    (value) => RING_CIRCUMFERENCE - (value / 100) * RING_CIRCUMFERENCE,
  );

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(score, LIFE_SCORE, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.35,
    });
    return () => controls.stop();
  }, [inView, reduced, score]);

  return (
    <div ref={containerRef} aria-hidden className="relative mx-auto w-full max-w-[330px]">
      {/* Ambient light behind the device, tinted with the brand gradient. */}
      <div
        className="nova-glow nova-glow-purple nova-animate-breathe absolute -inset-x-16 -inset-y-10 opacity-70"
        style={{ filter: "blur(90px)" }}
      />

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* Device frame. The gradient border is a lit bezel, not a stroke. */}
        <div
          className="relative rounded-[2.75rem] p-[1.5px] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
          style={{
            backgroundImage:
              "linear-gradient(160deg, rgba(255,255,255,0.26), rgba(255,255,255,0.05) 32%, rgba(255,255,255,0.02) 70%, rgba(139,92,246,0.35))",
          }}
        >
          <div className="relative overflow-hidden rounded-[2.65rem] bg-[#08080b]">
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pt-4 pb-1">
              <span className="nova-numeric text-[0.6875rem] font-semibold text-white/80">
                9:41
              </span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
                <span className="h-1.5 w-3.5 rounded-[2px] bg-white/45" />
              </div>
            </div>

            <div className="px-5 pt-4 pb-6">
              {/* Greeting */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[0.6875rem] tracking-[0.02em] text-white/40">
                    Вторник, 5 августа
                  </p>
                  <p className="mt-0.5 text-[1.0625rem] font-semibold tracking-[-0.02em] text-white">
                    Привет, Алекс
                  </p>
                </div>
                <div className="nova-gradient-bg flex h-8 w-8 items-center justify-center rounded-full text-[0.6875rem] font-semibold text-white">
                  А
                </div>
              </div>

              {/* Life Score */}
              <div className="nova-glass nova-edge relative overflow-hidden rounded-[1.35rem] px-4 py-6">
                <div className="flex flex-col items-center">
                  <div
                    className="relative"
                    style={{ width: RING_SIZE, height: RING_SIZE }}
                  >
                    <svg
                      width={RING_SIZE}
                      height={RING_SIZE}
                      className="-rotate-90"
                      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                    >
                      <defs>
                        <linearGradient id="nova-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="55%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RING_RADIUS}
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth={RING_STROKE}
                      />
                      <motion.circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RING_RADIUS}
                        fill="none"
                        stroke="url(#nova-ring)"
                        strokeWidth={RING_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        style={{ strokeDashoffset: dashOffset }}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span className="nova-numeric text-[2.75rem] leading-none font-bold text-white">
                        {displayedScore}
                      </motion.span>
                      <span className="mt-1.5 text-[0.625rem] tracking-[0.14em] text-white/40 uppercase">
                        Life Score
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[0.6875rem] font-medium text-emerald-300">
                      +6 за неделю
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillars */}
              <div className="mt-3 space-y-2">
                {MOCKUP_PILLARS.map((pillar, index) => (
                  <motion.div
                    key={pillar.label}
                    initial={reduced ? false : { opacity: 0, x: -10 }}
                    animate={inView ? { opacity: 1, x: 0 } : undefined}
                    transition={{
                      duration: 0.55,
                      delay: 0.5 + index * 0.09,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="nova-glass flex items-center gap-3 rounded-2xl px-3 py-2.5"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${pillar.color}1f` }}
                    >
                      <pillar.icon className="h-4 w-4" style={{ color: pillar.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[0.75rem] font-medium text-white/85">
                          {pillar.label}
                        </span>
                        <span className="nova-numeric text-[0.6875rem] text-white/50">
                          {pillar.value}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fill-muted">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: pillar.color }}
                          initial={reduced ? false : { width: 0 }}
                          animate={inView ? { width: `${pillar.progress}%` } : undefined}
                          transition={{
                            duration: 1,
                            delay: 0.7 + index * 0.09,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* AI insight */}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.7, delay: 1, ease: [0.16, 1, 0.3, 1] }}
                className="nova-glass nova-edge relative mt-3 overflow-hidden rounded-2xl p-3.5"
                style={{ borderColor: "rgba(139,92,246,0.28)" }}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[#a78bfa]" />
                  <span className="text-[0.625rem] font-semibold tracking-[0.12em] text-[#a78bfa] uppercase">
                    Nova AI
                  </span>
                </div>
                <p className="mt-1.5 text-[0.75rem] leading-[1.5] text-white/72">
                  Три коротких ночи подряд на фоне выросшего объёма. Сегодня — лёгкая
                  нагрузка и отбой до 23:30.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
