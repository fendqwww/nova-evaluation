"use client";

import { Camera, ScanLine, TrendingUp } from "lucide-react";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

const MACROS: ReadonlyArray<{ label: string; value: string; percent: number; color: string }> = [
  { label: "Белки", value: "42 г", percent: 74, color: "#8b5cf6" },
  { label: "Жиры", value: "18 г", percent: 40, color: "#0d9488" },
  { label: "Углеводы", value: "56 г", percent: 62, color: "#3b82f6" },
];

const PROGRESS_POINTS: ReadonlyArray<{ month: string; height: number }> = [
  { month: "Май", height: 44 },
  { month: "Июн", height: 58 },
  { month: "Июл", height: 71 },
  { month: "Авг", height: 88 },
];

/**
 * AI Vision — the two camera features, one card each.
 *
 * Both cards show the *result* of a photo rather than a photo: a landing that
 * ships stock food photography reads as a template, and the interesting part
 * was never the picture, it was the numbers pulled out of it.
 */
export function AiVisionSection() {
  return (
    <Section id="vision" className="overflow-hidden">
      <Glow tone="purple" className="-top-10 right-0 h-[32rem] w-[32rem] opacity-22" />

      <Reveal className="flex flex-col">
        <RevealItem>
          <Eyebrow>AI Vision</Eyebrow>
        </RevealItem>

        <RevealItem as="h2" className="nova-h1 mt-6 max-w-[16ch] text-white">
          Одна фотография — <span className="nova-gradient-text">и данные готовы</span>
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-7 max-w-[48ch]">
          Самая частая причина бросить трекинг — ручной ввод. NOVA убирает его.
        </RevealItem>

        <RevealItem className="mt-14">
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {/* Food */}
            <article className="nova-glass nova-edge nova-lift relative overflow-hidden rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8b5cf6]/15">
                  <Camera className="h-5 w-5 text-(--nova-purple-bright)" />
                </div>
                <div>
                  <h3 className="nova-h3 text-white">Еда</h3>
                  <p className="text-[0.8125rem] text-(--nova-text-subtle)">
                    фото → анализ КБЖУ
                  </p>
                </div>
              </div>

              <p className="nova-body mt-5">
                Сфотографируй тарелку — NOVA распознаёт блюдо, оценивает состав и сама
                записывает приём пищи в дневник.
              </p>

              {/* Result card */}
              <div className="mt-7 rounded-2xl border border-(--nova-hairline) bg-fill-subtle p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ScanLine className="h-4 w-4 text-(--nova-purple-bright)" />
                    <span className="text-[0.875rem] font-medium text-white">
                      Курица с рисом и овощами
                    </span>
                  </div>
                  <span className="nova-numeric shrink-0 text-[0.875rem] font-semibold text-white">
                    578 ккал
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {MACROS.map((macro) => (
                    <div key={macro.label} className="flex items-center gap-3">
                      <span className="w-[4.5rem] shrink-0 text-[0.75rem] text-(--nova-text-muted)">
                        {macro.label}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill-muted">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${macro.percent}%`,
                            backgroundColor: macro.color,
                          }}
                        />
                      </span>
                      <span className="nova-numeric w-10 shrink-0 text-right text-[0.75rem] text-white/70">
                        {macro.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            {/* Appearance */}
            <article className="nova-glass nova-edge nova-lift relative overflow-hidden rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3b82f6]/15">
                  <TrendingUp className="h-5 w-5 text-[#60a5fa]" />
                </div>
                <div>
                  <h3 className="nova-h3 text-white">Внешность</h3>
                  <p className="text-[0.8125rem] text-(--nova-text-subtle)">
                    фото → отслеживание изменений
                  </p>
                </div>
              </div>

              <p className="nova-body mt-5">
                Серия фотографий во времени превращается в объективную линию изменений —
                вместо догадок в зеркале и веса, который прыгает каждый день.
              </p>

              {/* Result card */}
              <div className="mt-7 rounded-2xl border border-(--nova-hairline) bg-fill-subtle p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.875rem] font-medium text-white">
                    Динамика за 4 месяца
                  </span>
                  <span className="text-[0.75rem] font-medium text-emerald-300">
                    заметный прогресс
                  </span>
                </div>

                <div className="mt-5 flex h-24 items-end gap-3">
                  {PROGRESS_POINTS.map((point) => (
                    <div key={point.month} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-full w-full items-end">
                        <div
                          className="w-full rounded-t-[4px] bg-linear-to-t from-[#3b82f6]/35 to-[#8b5cf6]"
                          style={{ height: `${point.height}%` }}
                        />
                      </div>
                      <span className="text-[0.6875rem] text-(--nova-text-subtle)">
                        {point.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </RevealItem>
      </Reveal>
    </Section>
  );
}
