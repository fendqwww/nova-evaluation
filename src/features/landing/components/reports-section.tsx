"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Moon, Utensils, Dumbbell, Repeat } from "lucide-react";
import { PILLARS } from "../constants";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

const PILLAR_ICONS = {
  sleep: Moon,
  nutrition: Utensils,
  training: Dumbbell,
  habits: Repeat,
} as const;

/** Twelve weeks of Life Score. One series — so the chart needs no legend. */
const TREND: ReadonlyArray<{ week: string; score: number }> = [
  { week: "Нед 1", score: 54 },
  { week: "Нед 2", score: 58 },
  { week: "Нед 3", score: 55 },
  { week: "Нед 4", score: 62 },
  { week: "Нед 5", score: 66 },
  { week: "Нед 6", score: 63 },
  { week: "Нед 7", score: 69 },
  { week: "Нед 8", score: 72 },
  { week: "Нед 9", score: 70 },
  { week: "Нед 10", score: 76 },
  { week: "Нед 11", score: 79 },
  { week: "Нед 12", score: 82 },
];

/** Week-over-week movement per pillar, in the pillar's own units. */
const WEEKLY_CHANGES: ReadonlyArray<{
  id: (typeof PILLARS)[number]["id"];
  value: string;
  delta: number;
  deltaLabel: string;
}> = [
  { id: "sleep", value: "7ч 24м", delta: 1, deltaLabel: "+38 мин к средней ночи" },
  { id: "nutrition", value: "91%", delta: 1, deltaLabel: "+7% попаданий в норму КБЖУ" },
  { id: "training", value: "4 / 5", delta: 1, deltaLabel: "+1 тренировка" },
  { id: "habits", value: "86%", delta: -1, deltaLabel: "−4% выполнения" },
];

/* Plot geometry. A viewBox with preserveAspectRatio="none" would distort the
   stroke, so the chart keeps its aspect and scales as a whole. */
const W = 760;
const H = 240;
const PAD = { top: 20, right: 20, bottom: 28, left: 34 };
const Y_MIN = 40;
const Y_MAX = 100;

const x = (index: number) =>
  PAD.left + (index / (TREND.length - 1)) * (W - PAD.left - PAD.right);
const y = (score: number) =>
  PAD.top + (1 - (score - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.top - PAD.bottom);

const linePath = TREND.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.score)}`).join(" ");
const areaPath = `${linePath} L ${x(TREND.length - 1)} ${H - PAD.bottom} L ${x(0)} ${H - PAD.bottom} Z`;

const GRID_LINES = [40, 55, 70, 85, 100];

/**
 * Reports.
 *
 * The trend is a single series, so it carries no legend — the heading names it,
 * and only the final point is labelled. The four pillars are deliberately *not*
 * plotted as four series on that chart: NOVA violet and the brand blue are
 * indistinguishable under deuteranopia, so they are shown as separate labelled
 * rows where an icon and a word carry the identity and colour only reinforces.
 */
export function ReportsSection() {
  const reduced = useReducedMotion();

  return (
    <Section id="reports" className="overflow-hidden">
      <Glow tone="blue" className="top-20 -left-52 h-[34rem] w-[34rem] opacity-22" />

      <Reveal className="flex flex-col">
        <RevealItem>
          <Eyebrow>Отчёты</Eyebrow>
        </RevealItem>

        <RevealItem as="h2" className="nova-h1 mt-6 max-w-[18ch] text-white">
          Прогресс, который{" "}
          <span className="nova-gradient-text">видно</span>
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-7 max-w-[50ch]">
          Life Score сводит четыре области в одно число, а недельные отчёты показывают, что
          именно его двигает.
        </RevealItem>

        <RevealItem className="mt-14">
          <div className="nova-glass nova-edge overflow-hidden rounded-3xl p-5 sm:p-8">
            {/* Headline number */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="nova-eyebrow">Life Score · 12 недель</p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="nova-numeric text-[3.25rem] leading-none font-bold text-white">
                    82
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[0.8125rem] font-medium text-emerald-300">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    +28 за 12 недель
                  </span>
                </div>
              </div>
              <p className="text-[0.8125rem] text-(--nova-text-subtle)">
                Обновляется каждое утро
              </p>
            </div>

            {/* Trend. Horizontally scrollable on narrow screens rather than
                squashed — a 12-point line at 320px is unreadable. */}
            <div className="mt-8 -mx-1 overflow-x-auto px-1">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="h-[200px] w-full min-w-[520px] sm:h-[240px]"
                role="img"
                aria-label="График Life Score за 12 недель: рост с 54 до 82"
              >
                <defs>
                  <linearGradient id="nova-trend-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                  <linearGradient id="nova-trend-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Recessive grid + axis labels */}
                {GRID_LINES.map((value) => (
                  <g key={value}>
                    <line
                      x1={PAD.left}
                      x2={W - PAD.right}
                      y1={y(value)}
                      y2={y(value)}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={1}
                    />
                    <text
                      x={PAD.left - 10}
                      y={y(value) + 4}
                      textAnchor="end"
                      className="nova-numeric"
                      fill="rgba(255,255,255,0.28)"
                      fontSize={11}
                    >
                      {value}
                    </text>
                  </g>
                ))}

                {/* X labels — every third week, so they never collide */}
                {TREND.map((d, i) =>
                  i % 3 === 0 || i === TREND.length - 1 ? (
                    <text
                      key={d.week}
                      x={x(i)}
                      y={H - 8}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.28)"
                      fontSize={11}
                    >
                      {d.week}
                    </text>
                  ) : null,
                )}

                <path d={areaPath} fill="url(#nova-trend-fill)" />

                <motion.path
                  d={linePath}
                  fill="none"
                  stroke="url(#nova-trend-line)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduced ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Only the latest point is marked and labelled. */}
                <circle
                  cx={x(TREND.length - 1)}
                  cy={y(82)}
                  r={5}
                  fill="#3b82f6"
                  stroke="#050505"
                  strokeWidth={2}
                />
              </svg>
            </div>

            <hr className="nova-rule my-7" />

            {/* Per-pillar movement — labelled rows, not a four-series chart. */}
            <div>
              <p className="nova-eyebrow mb-5">Изменения за неделю</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {WEEKLY_CHANGES.map((change) => {
                  const pillar = PILLARS.find((p) => p.id === change.id);
                  if (!pillar) return null;
                  const Icon = PILLAR_ICONS[change.id];
                  const positive = change.delta > 0;
                  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

                  return (
                    <div
                      key={change.id}
                      className="flex items-center gap-3.5 rounded-2xl border border-(--nova-hairline) bg-white/[0.015] px-4 py-3.5"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${pillar.color}26` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: pillar.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[0.875rem] font-medium text-white">
                            {pillar.russianTitle}
                          </span>
                          <span className="nova-numeric text-[0.875rem] font-semibold text-white">
                            {change.value}
                          </span>
                        </div>
                        <span
                          className={`mt-0.5 flex items-center gap-1 text-[0.75rem] ${
                            positive ? "text-emerald-300" : "text-[#f5a524]"
                          }`}
                        >
                          <Arrow className="h-3 w-3 shrink-0" />
                          {change.deltaLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </RevealItem>
      </Reveal>
    </Section>
  );
}
