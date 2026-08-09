"use client";

import { Check } from "lucide-react";
import { PRICING_TIERS } from "../constants";
import { CtaButton } from "./cta-button";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

/**
 * Pricing.
 *
 * Every number on this table — the prices and the three AI allowances under
 * each of them — comes from the same source the app enforces (see
 * PRICING_TIERS). The page used to carry its own figures and a "цена скоро"
 * placeholder while the app already sold the tiers at a real price.
 *
 * Checkout still does not exist, so the CTA opens the support bot on that
 * tier's payment branch rather than a payment form, and the line under the
 * table says so. A button that promised a checkout would be the one dishonest
 * thing on the page.
 */
export function PricingSection() {
  return (
    <Section id="pricing" className="overflow-hidden">
      <Glow tone="purple" className="top-1/4 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 opacity-22" />

      <Reveal className="flex flex-col items-center text-center">
        <RevealItem>
          <Eyebrow>Тарифы</Eyebrow>
        </RevealItem>

        <RevealItem as="h2" className="nova-h1 mt-6 max-w-[16ch] text-white">
          Начни бесплатно. <span className="nova-gradient-text">Расти дальше.</span>
        </RevealItem>

        <RevealItem as="p" className="nova-lead mt-6 max-w-[46ch]">
          Всё приложение бесплатно. Платные тарифы расширяют только лимиты AI —
          коуча, анализа еды и внешности.
        </RevealItem>

        <RevealItem className="mt-14 w-full">
          <div className="grid gap-4 lg:grid-cols-3 lg:items-start lg:gap-5">
            {PRICING_TIERS.map((tier) => (
              <article
                key={tier.id}
                className={`nova-glass nova-edge relative flex h-full flex-col overflow-hidden rounded-3xl p-6 text-left sm:p-8 ${
                  tier.featured ? "lg:-mt-4 lg:pb-10" : ""
                }`}
                style={
                  tier.featured ? { borderColor: "rgba(139,92,246,0.4)" } : undefined
                }
              >
                {tier.featured && (
                  <>
                    <div
                      aria-hidden
                      className="nova-glow nova-glow-purple absolute -top-28 left-1/2 h-64 w-64 -translate-x-1/2 opacity-45"
                    />
                    <span className="nova-gradient-bg relative mb-5 inline-flex w-fit rounded-full px-3 py-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-white uppercase">
                      Рекомендуем
                    </span>
                  </>
                )}

                <div className="relative">
                  <h3 className="text-[0.9375rem] font-semibold tracking-[0.14em] text-white">
                    {tier.name}
                  </h3>
                  <p className="mt-2 text-[0.8125rem] leading-[1.5] text-(--nova-text-subtle)">
                    {tier.tagline}
                  </p>

                  <div className="mt-7 flex items-baseline gap-2">
                    <span className="nova-numeric text-[2.75rem] leading-none font-bold text-white">
                      {tier.price}
                    </span>
                    <span className="text-[0.8125rem] text-(--nova-text-subtle)">
                      {tier.priceNote}
                    </span>
                  </div>

                  <hr className="nova-rule my-7" />

                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                            tier.featured ? "nova-gradient-bg" : "bg-fill-strong"
                          }`}
                        >
                          <Check
                            className={`h-2.5 w-2.5 ${tier.featured ? "text-white" : "text-white/70"}`}
                            strokeWidth={3}
                          />
                        </span>
                        <span className="text-[0.875rem] leading-[1.5] text-(--nova-text-muted)">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-8 pt-0 lg:mt-auto lg:pt-8">
                  <CtaButton
                    href={tier.href}
                    external
                    variant={tier.featured ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {tier.cta}
                  </CtaButton>
                </div>
              </article>
            ))}
          </div>
        </RevealItem>

        <RevealItem as="p" className="mt-8 text-[0.8125rem] text-(--nova-text-faint)">
          Автоматической оплаты пока нет: кнопка открывает бота поддержки, тариф
          включают вручную. Условия использования — в{" "}
          <a href="/legal/offer" className="underline underline-offset-2 hover:text-white">
            Публичной оферте
          </a>
          ; согласие на обработку данных запрашивается при первом входе в приложение.
        </RevealItem>
      </Reveal>
    </Section>
  );
}
