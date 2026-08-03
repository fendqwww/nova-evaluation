"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { PLAN_LABELS, formatPrice, type Plan } from "@/features/settings/lib/plans";
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
 * One tier.
 *
 * The button is disabled on every paid tier and says "Скоро" rather than
 * "Оформить": there is no payment integration, and a button that opens nothing
 * is worse than one that admits it. When billing exists this is the only place
 * that changes — the card already knows which plan is current, because the
 * account carries one (UserSettings.plan).
 *
 * The current tier gets an accent hairline and a "Ваш тариф" label instead of a
 * button. No tier is visually pushed harder than the others; the price does
 * that work on its own.
 */
export function PlanCard({ plan, current }: { plan: Plan; current: PlanId }) {
  const isCurrent = plan.id === current;

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
            <span className="shrink-0 rounded-md bg-accent-muted px-2 py-1 text-label text-accent">
              ВАШ ТАРИФ
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

        {!isCurrent && (
          <Button size="lg" variant="secondary" disabled>
            <Sparkles className="h-4 w-4" />
            Скоро
          </Button>
        )}
      </div>
    </Card>
  );
}
