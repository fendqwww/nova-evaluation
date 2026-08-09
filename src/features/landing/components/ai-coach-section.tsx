"use client";

import { Activity, Brain, Lightbulb, Search } from "lucide-react";
import { COACH_CAPABILITIES } from "../constants";
import { NovaMark } from "./nova-mark";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

const CAPABILITY_ICONS = [Activity, Search, Lightbulb, Brain] as const;

/**
 * AI Coach.
 *
 * The conversation mockup shows a *structured* answer — verdict, cause,
 * action — because that is the actual product claim: the coach returns cards,
 * not a wall of text. A generic chat bubble here would undersell it.
 */
export function AiCoachSection() {
  return (
    <Section id="coach" className="overflow-hidden">
      <Glow tone="purple" className="-top-20 left-1/4 h-[36rem] w-[36rem] opacity-25" />

      <Reveal className="flex flex-col">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <RevealItem>
              <Eyebrow>AI Coach</Eyebrow>
            </RevealItem>

            <RevealItem as="h2" className="nova-h1 mt-6 max-w-[15ch] text-white">
              Не просто чат.{" "}
              <span className="nova-gradient-text">AI, который знает твой прогресс.</span>
            </RevealItem>

            <RevealItem as="p" className="nova-lead mt-7 max-w-[46ch]">
              Коуч видит твою историю целиком и отвечает с опорой на неё — а не на общие
              рекомендации из интернета.
            </RevealItem>

            <RevealItem className="mt-10">
              <ul className="space-y-5">
                {COACH_CAPABILITIES.map((capability, index) => {
                  const Icon = CAPABILITY_ICONS[index];
                  return (
                    <li key={capability.title} className="flex gap-4">
                      <div className="nova-glass mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="h-4.5 w-4.5 text-(--nova-purple-bright)" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] font-medium text-white">
                          {capability.title}
                        </p>
                        <p className="mt-1 text-[0.875rem] leading-[1.6] text-(--nova-text-muted)">
                          {capability.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </RevealItem>
          </div>

          {/* Conversation */}
          <RevealItem>
            <div className="relative">
              <div
                aria-hidden
                className="nova-glow nova-glow-blue absolute -inset-6 opacity-35"
              />

              <div className="nova-glass nova-edge relative overflow-hidden rounded-3xl p-5 sm:p-6">
                {/* User message */}
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-fill-muted px-4 py-2.5 text-[0.875rem] leading-[1.5] text-white/90">
                    Почему я всю неделю как выжатый?
                  </p>
                </div>

                {/* Coach answer, rendered as structured cards */}
                <div className="mt-5 flex gap-3">
                  <div className="nova-gradient-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                    <NovaMark className="h-4 w-4 brightness-0 invert" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="rounded-2xl rounded-tl-md border border-(--nova-hairline) bg-white/[0.025] p-3.5">
                      <p className="nova-eyebrow mb-2">Состояние</p>
                      <div className="flex items-baseline gap-2">
                        <span className="nova-numeric text-[1.75rem] leading-none font-bold text-white">
                          61
                        </span>
                        <span className="text-[0.75rem] font-medium text-[#f5a524]">
                          −14 за неделю
                        </span>
                      </div>
                      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-fill-muted">
                        <div
                          className="h-full rounded-full bg-[#f5a524]"
                          style={{ width: "61%" }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-(--nova-hairline) bg-white/[0.025] p-3.5">
                      <p className="nova-eyebrow mb-2">Причина</p>
                      <p className="text-[0.8125rem] leading-[1.55] text-white/78">
                        Средний сон упал до 6ч 05м при объёме тренировок +40%. Восстановление
                        не покрывает нагрузку четвёртый день.
                      </p>
                    </div>

                    <div
                      className="rounded-2xl border p-3.5"
                      style={{
                        borderColor: "rgba(139,92,246,0.32)",
                        backgroundColor: "rgba(139,92,246,0.07)",
                      }}
                    >
                      <p className="nova-eyebrow mb-2 text-(--nova-purple-bright)">
                        Рекомендация
                      </p>
                      <p className="text-[0.8125rem] leading-[1.55] text-white/88">
                        Сегодня — восстановительная тренировка вместо силовой, отбой до
                        23:30. Вернёмся к объёму, когда сон стабилизируется на 7ч+.
                      </p>
                    </div>

                    {/* Memory chip — the differentiator, so it gets its own line. */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <Brain className="h-3.5 w-3.5 shrink-0 text-(--nova-text-faint)" />
                      <p className="text-[0.75rem] text-(--nova-text-subtle)">
                        Помню: цель — набор массы, тренировки 5 раз в неделю
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RevealItem>
        </div>
      </Reveal>
    </Section>
  );
}
