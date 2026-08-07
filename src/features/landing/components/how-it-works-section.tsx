"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Moon, Utensils, Dumbbell, Repeat, ChevronDown } from "lucide-react";
import { PILLARS } from "../constants";
import { NovaMark } from "./nova-mark";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

const PILLAR_ICONS = {
  sleep: Moon,
  nutrition: Utensils,
  training: Dumbbell,
  habits: Repeat,
} as const;

const OUTPUTS: ReadonlyArray<string> = [
  "Что изменить сегодня",
  "Почему именно это",
  "Что проверить через неделю",
];

/**
 * The pipeline diagram: four inputs → one engine → personal recommendations.
 *
 * Laid out as three stacked bands rather than a literal flow-chart. A real
 * chart with elbow connectors is fragile at every breakpoint; three centred
 * bands separated by an animated pulse read as flow at any width and never
 * misalign.
 */
export function HowItWorksSection() {
  const reduced = useReducedMotion();

  return (
    <Section id="how" className="overflow-hidden">
      <Glow tone="blue" className="top-1/3 -right-56 h-[34rem] w-[34rem] opacity-25" />

      <Reveal className="flex flex-col items-center text-center">
        <RevealItem>
          <Eyebrow>Как это работает</Eyebrow>
        </RevealItem>

        <RevealItem as="h2" className="nova-h1 mt-6 max-w-[17ch] text-white">
          Четыре области. Один <span className="nova-gradient-text">интеллект</span>.
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-6 max-w-[48ch]">
          NOVA не смотрит на метрики по отдельности. Она читает их вместе — потому что
          именно так они и работают в теле.
        </RevealItem>

        {/* Inputs */}
        <RevealItem className="mt-16 w-full">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {PILLARS.map((pillar) => {
              const Icon = PILLAR_ICONS[pillar.id];
              return (
                <div
                  key={pillar.id}
                  className="nova-glass nova-lift flex flex-col items-center gap-3 rounded-2xl px-4 py-6"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${pillar.color}1f` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: pillar.color }} />
                  </div>
                  <span className="text-[0.9375rem] font-medium text-white">
                    {pillar.russianTitle}
                  </span>
                </div>
              );
            })}
          </div>
        </RevealItem>

        {/* Flow down into the engine */}
        <FlowConnector reduced={reduced} />

        {/* Engine */}
        <RevealItem className="w-full">
          <div className="relative mx-auto max-w-md">
            <div
              aria-hidden
              className="nova-glow nova-glow-purple nova-animate-breathe absolute -inset-8 opacity-60"
            />
            <div
              className="nova-glass nova-edge relative overflow-hidden rounded-3xl px-6 py-8"
              style={{ borderColor: "rgba(139,92,246,0.34)" }}
            >
              {/* Light sweeping across the top edge — the engine "thinking". */}
              {!reduced && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden"
                >
                  <span className="nova-animate-sweep block h-px w-1/3 bg-linear-to-r from-transparent via-(--nova-purple-bright) to-transparent" />
                </span>
              )}

              <div className="flex flex-col items-center gap-3">
                <NovaMark className="h-9 w-9" />
                <p className="text-[1.375rem] font-semibold tracking-[-0.03em] text-white">
                  NOVA AI
                </p>
                <p className="max-w-[34ch] text-[0.875rem] leading-[1.6] text-(--nova-text-muted)">
                  Находит связи между сном, нагрузкой, питанием и привычками — и
                  объясняет, что из этого следует.
                </p>
              </div>
            </div>
          </div>
        </RevealItem>

        <FlowConnector reduced={reduced} />

        {/* Output */}
        <RevealItem className="w-full">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {OUTPUTS.map((output) => (
              <div
                key={output}
                className="nova-glass rounded-2xl px-5 py-5 text-[0.875rem] font-medium text-white/85"
              >
                {output}
              </div>
            ))}
          </div>
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-10 max-w-[42ch]">
          Персональные рекомендации — не общие советы, а следующий шаг для твоих данных.
        </RevealItem>
      </Reveal>
    </Section>
  );
}

/**
 * The vertical link between two bands of the diagram: a hairline that fades in
 * at both ends, with a dot travelling down it.
 */
function FlowConnector({ reduced }: { reduced: boolean | null }) {
  return (
    <div aria-hidden className="relative flex h-20 w-full items-center justify-center sm:h-24">
      <span className="absolute inset-y-0 w-px bg-linear-to-b from-transparent via-(--nova-hairline-strong) to-transparent" />
      {/* The travelling pulse. Animated with `y` (a transform) rather than
          `top`, so an infinite loop never triggers layout on the main thread. */}
      {!reduced && (
        <motion.span
          className="absolute top-0 h-1.5 w-1.5 rounded-full bg-(--nova-purple-bright) shadow-[0_0_12px_2px_rgba(167,139,250,0.7)]"
          initial={{ y: 8, opacity: 0 }}
          whileInView={{ y: [8, 72], opacity: [0, 1, 1, 0] }}
          viewport={{ once: false, margin: "-20% 0px" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <ChevronDown className="relative h-4 w-4 text-(--nova-text-faint)" />
    </div>
  );
}
