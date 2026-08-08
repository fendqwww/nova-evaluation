"use client";

import { Check, Send } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { PLAN_LABELS, formatPrice, type Plan } from "@/features/settings/lib/plans";
import { daysLeft, formatPlanUntil } from "@/features/settings/lib/plan-status";
import { SUPPORT_USERNAME } from "@/features/settings/lib/support";
import type { PlanId } from "@/features/settings/types";

const TONE_DOT: Record<Plan["tone"], string> = {
  positive: "bg-tint-green",
  blue: "bg-tint-blue",
  purple: "bg-tint-purple",
};

const TONE_TEXT: Record<Plan["tone"], string> = {
  positive: "text-tint-green",
  blue: "text-tint-blue",
  purple: "text-tint-purple",
};

/**
 * The upgrade button's fill, per tier.
 *
 * A two-stop diagonal rather than a flat tint: at 3.25rem tall a solid block of
 * saturated colour reads as a banner, and the gradient is what keeps it
 * reading as a control. Both stops are existing category tokens, so the button
 * cannot drift away from the dot above it, and the drop shadow is the same
 * colour as the fill — the trick the primary Button variant uses to sit a
 * control above the card instead of painting it on.
 */
const TONE_BUTTON: Record<Plan["tone"], string> = {
  positive: "bg-tint-green shadow-[0_8px_24px_-10px_var(--tint-green)]",
  blue: "bg-[linear-gradient(135deg,var(--tint-blue),var(--tint-cyan))] shadow-[0_8px_24px_-10px_var(--tint-blue)]",
  purple:
    "bg-[linear-gradient(135deg,var(--tint-purple),var(--tint-blue))] shadow-[0_8px_24px_-10px_var(--tint-purple)]",
};

/**
 * One tier.
 *
 * The paid tiers carry a real button now. There is still no payment provider,
 * so it does not open a checkout — it opens the support chat with the request
 * already written (see lib/support.ts), because the tier is genuinely for sale
 * and "Скоро" would be the false half of that. When billing lands, this button
 * changes its href for a checkout call and nothing else on the screen moves.
 *
 * The current tier gets an accent hairline, a "Ваш тариф" label and, when the
 * period has an end date, the date under it — an account that was activated by
 * hand needs to be able to see how long it runs without asking.
 */
export function PlanCard({
  plan,
  current,
  planUntil,
  href,
}: {
  plan: Plan;
  current: PlanId;
  /** ISO end of the current paid period, when this card is the current tier. */
  planUntil: string | null;
  /** Where "Получить" goes. Null on FREE, which is nobody's upgrade. */
  href: string | null;
}) {
  const isCurrent = plan.id === current;
  const until = isCurrent && planUntil ? formatPlanUntil(planUntil) : null;
  const left = isCurrent ? daysLeft(planUntil) : null;

  return (
    <Card elevation={isCurrent ? "accent" : "raised"}>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", TONE_DOT[plan.tone])} />
              <h3 className="text-title text-foreground">{plan.name}</h3>
            </div>
            <p className="text-caption text-muted-foreground">{plan.tagline}</p>
          </div>

          {isCurrent && (
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-md bg-accent-muted px-2 py-1 text-label text-accent">
                ВАШ ТАРИФ
              </span>
              {until && (
                <span
                  className={cn(
                    "text-[0.6875rem]",
                    // Under a week left is the point at which the date stops
                    // being reassurance and starts being a thing to act on.
                    left !== null && left <= 7 ? "text-tint-orange" : "text-subtle-foreground",
                  )}
                >
                  {until}
                </span>
              )}
            </span>
          )}
        </div>

        <p
          className={cn(
            "numeric text-[1.625rem] font-bold leading-none tracking-[-0.03em]",
            plan.price === 0 ? "text-foreground" : TONE_TEXT[plan.tone],
          )}
        >
          {formatPrice(plan.price)}
        </p>

        <ul className="flex flex-col gap-2">
          {plan.inherits && (
            <li className="text-caption font-medium text-subtle-foreground">
              Всё из {PLAN_LABELS[plan.inherits]}, плюс:
            </li>
          )}

          {plan.features.map((feature) => (
            <li key={feature.text} className="flex items-start gap-2.5">
              <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", TONE_TEXT[plan.tone])} />
              <span className="text-caption text-muted-foreground">{feature.text}</span>
            </li>
          ))}
        </ul>

        {!isCurrent && href && (
          <div className="flex flex-col gap-2">
            <Button
              asChild
              size="lg"
              className={cn(
                "w-full font-semibold text-white",
                // Tinted like the tier it buys rather than the app accent: the
                // dot, the price and the button then read as one object. The
                // top sheen and the coloured drop are the same lighting the
                // primary Button variant uses, so this stays inside the system
                // instead of becoming a second button language.
                TONE_BUTTON[plan.tone],
                "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/20 before:to-transparent",
              )}
            >
              <a href={href} target="_blank" rel="noopener noreferrer">
                <Send className="h-4 w-4" />
                Получить {plan.name.replace("NOVA ", "")}
              </a>
            </Button>

            <p className="text-center text-[0.6875rem] leading-relaxed text-subtle-foreground">
              Откроется бот @{SUPPORT_USERNAME} — активируем вручную после оплаты
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
