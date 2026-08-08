"use client";

import { ArrowRight } from "lucide-react";
import { TELEGRAM_APP_URL } from "../constants";
import { CtaButton } from "./cta-button";
import { NovaMark } from "./nova-mark";
import { Reveal, RevealItem } from "./reveal";

/**
 * The closing ask. One statement, one action — the page has already made its
 * argument, so this block adds nothing new and gets out of the way.
 */
export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden px-5 py-28 sm:px-8 sm:py-36 lg:px-10">
      <div aria-hidden className="nova-grid pointer-events-none absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="nova-glow nova-glow-purple nova-animate-breathe absolute top-1/2 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 opacity-45"
      />

      <Reveal className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <RevealItem>
          <NovaMark className="h-10 w-10" />
        </RevealItem>

        <RevealItem as="h2" className="nova-h1 mt-8 max-w-[16ch] text-white">
          Начни становиться лучше <span className="nova-gradient-text">каждый день</span>
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-6 max-w-[44ch]">
          Бесплатный тариф, без карты. Доступ открывается за пару минут.
        </RevealItem>

        <RevealItem className="mt-10 w-full sm:w-auto">
          {/* «Бесплатный тариф, без карты» строкой выше — значит, кнопка ведёт
              в приложение. Поддержка нужна только для платных тарифов. */}
          <CtaButton href={TELEGRAM_APP_URL} external className="w-full sm:w-auto">
            Открыть Nova
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </CtaButton>
        </RevealItem>
      </Reveal>
    </section>
  );
}
