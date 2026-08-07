"use client";

import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

/** Raw numbers, deliberately without meaning — the "before" state. */
const RAW_DATA: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Шаги", value: "8 214" },
  { label: "Сон", value: "6ч 10м" },
  { label: "Калории", value: "2 140" },
  { label: "Пульс покоя", value: "58" },
  { label: "Вода", value: "1.2 л" },
  { label: "Тренировки", value: "3" },
];

/**
 * The problem statement.
 *
 * Built as a visual argument, not a paragraph: a grid of context-free numbers
 * on one side, a single unambiguous instruction on the other. The contrast is
 * the point, so the two panels are deliberately styled as opposites — the raw
 * data is flat and grey, the action is lit and gradient-bordered.
 */
export function ProblemSection() {
  return (
    <Section id="problem" className="overflow-hidden">
      <Glow tone="purple" className="top-1/2 -left-64 h-[32rem] w-[32rem] opacity-25" />

      <Reveal className="flex flex-col">
        <RevealItem>
          <Eyebrow>Проблема</Eyebrow>
        </RevealItem>

        <RevealItem as="h2" className="nova-h1 mt-6 max-w-[19ch] text-white">
          Большинство людей собирают данные, но не знают{" "}
          <span className="text-(--nova-text-faint)">что с ними делать</span>
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-7 max-w-[52ch]">
          Приложения показывают цифры и останавливаются на этом. Решение — что именно
          изменить сегодня — остаётся на тебе.
        </RevealItem>

        {/* The contrast */}
        <RevealItem className="mt-16">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
            {/* Before */}
            <div className="nova-glass rounded-3xl p-6 sm:p-7">
              <p className="nova-eyebrow mb-5">Сегодня</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {RAW_DATA.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/6 bg-white/[0.015] px-3 py-3"
                  >
                    <p className="nova-numeric text-[1.0625rem] font-semibold text-white/45">
                      {item.value}
                    </p>
                    <p className="mt-0.5 text-[0.6875rem] text-white/25">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[0.8125rem] text-(--nova-text-faint)">
                Данные есть. Выводов нет.
              </p>
            </div>

            {/* Connector — rotates from vertical (stacked) to horizontal (side
                by side) so the argument reads in the direction of the layout. */}
            <div
              aria-hidden
              className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--nova-hairline-strong) bg-(--nova-bg)"
            >
              <ArrowDown className="h-4 w-4 text-(--nova-purple-bright) lg:hidden" />
              <ArrowRight className="hidden h-4 w-4 text-(--nova-purple-bright) lg:block" />
            </div>

            {/* After */}
            <div
              className="nova-glass nova-edge relative overflow-hidden rounded-3xl p-6 sm:p-7"
              style={{ borderColor: "rgba(139,92,246,0.32)" }}
            >
              <div
                aria-hidden
                className="nova-glow nova-glow-purple absolute -top-24 -right-16 h-56 w-56 opacity-40"
              />
              <p className="nova-eyebrow relative mb-5 text-(--nova-purple-bright)">
                С NOVA
              </p>
              <p className="relative nova-h3 text-white">
                Сегодня: лёгкая нагрузка и отбой до 23:30
              </p>
              <p className="relative mt-3 text-[0.875rem] leading-[1.6] text-(--nova-text-muted)">
                Сон 6ч 10м третью ночь подряд, объём тренировок вырос на 40% за неделю.
                Восстановление не успевает за нагрузкой.
              </p>
              <ul className="relative mt-5 space-y-2">
                {["Причина найдена", "Действие на сегодня", "Проверю через 3 дня"].map(
                  (item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-[0.8125rem] text-white/80"
                    >
                      <span className="nova-gradient-bg flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </RevealItem>

        <RevealItem className="mt-16 text-center lg:mt-20">
          <p className="nova-h2 mx-auto max-w-[20ch] text-white">
            NOVA превращает данные в <span className="nova-gradient-text">действия</span>
          </p>
        </RevealItem>
      </Reveal>
    </Section>
  );
}
