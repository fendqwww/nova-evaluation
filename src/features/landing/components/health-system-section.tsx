"use client";

import { Moon, Utensils, Dumbbell, Repeat } from "lucide-react";
import { PILLARS } from "../constants";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

const PILLAR_ICONS = {
  sleep: Moon,
  nutrition: Utensils,
  training: Dumbbell,
  habits: Repeat,
} as const;

/**
 * The four modules, one card each.
 *
 * Each card carries its pillar's colour as a CSS variable, so the icon well,
 * the hover glow and the metric dots all tint from one value — a card is never
 * assembled from four separately-chosen colours.
 */
export function HealthSystemSection() {
  return (
    <Section id="system" className="overflow-hidden">
      <Glow tone="purple" className="bottom-0 -left-48 h-[32rem] w-[32rem] opacity-20" />

      <Reveal className="flex flex-col">
        <RevealItem>
          <Eyebrow>Health System</Eyebrow>
        </RevealItem>

        <RevealItem as="h2" className="nova-h1 mt-6 max-w-[18ch] text-white">
          Всё, что влияет на тебя — <span className="nova-gradient-text">в одном месте</span>
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-7 max-w-[50ch]">
          Четыре модуля, которые работают как одна система. Каждый из них усиливает
          остальные три.
        </RevealItem>

        <RevealItem className="mt-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            {PILLARS.map((pillar) => {
              const Icon = PILLAR_ICONS[pillar.id];
              return (
                <article
                  key={pillar.id}
                  className="nova-glass nova-edge nova-lift group relative overflow-hidden rounded-3xl p-6 sm:p-8"
                  style={{ ["--pillar" as string]: pillar.color }}
                >
                  {/* Colour arrives only on hover, so the grid reads calm at
                      rest and responsive under the cursor. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full opacity-0 blur-[64px] transition-opacity duration-500 group-hover:opacity-45"
                    style={{ backgroundColor: pillar.color }}
                  />

                  <div className="relative">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${pillar.color}1f` }}
                    >
                      <Icon className="h-5.5 w-5.5" style={{ color: pillar.color }} />
                    </div>

                    <div className="mt-6 flex items-baseline gap-2.5">
                      <h3 className="nova-h3 text-white">{pillar.title}</h3>
                      <span className="text-[0.8125rem] text-(--nova-text-faint)">
                        {pillar.russianTitle}
                      </span>
                    </div>

                    <p className="nova-body mt-3 max-w-[42ch]">{pillar.description}</p>

                    <ul className="mt-6 flex flex-wrap gap-2">
                      {pillar.metrics.map((metric) => (
                        <li
                          key={metric}
                          className="rounded-full border border-(--nova-hairline) px-3 py-1 text-[0.75rem] text-(--nova-text-muted)"
                        >
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </RevealItem>
      </Reveal>
    </Section>
  );
}
