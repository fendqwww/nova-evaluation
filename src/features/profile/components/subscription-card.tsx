"use client";

import Link from "next/link";
import { Check, Crown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { PLAN_LIST, formatPrice } from "@/features/settings/lib/plans";
import type { PlanId } from "@/features/settings/types";

/**
 * The tier summary, with the way through to the full comparison.
 *
 * A compact strip of all three plans rather than a repeat of the subscription
 * screen: the question this card answers is "на чём я и что есть выше", and
 * three feature lists would be the same screen twice. The catalogue itself
 * lives in features/settings/lib/plans.ts and is read from there — one source
 * for what a tier is, whichever screen renders it.
 *
 * Nothing here is enforced anywhere in the app; the subscription screen is
 * where that is spelled out, and this card is careful not to imply otherwise.
 */
export function ProfileSubscriptionCard({ plan }: { plan: PlanId }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-section text-subtle-foreground">Подписка</h2>

      <Card>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <IconChip tone="goal" size="lg">
              <Crown className="h-5 w-5" />
            </IconChip>

            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-title text-foreground">
                {PLAN_LIST.find((item) => item.id === plan)?.name ?? "NOVA FREE"}
              </p>
              <p className="text-caption text-muted-foreground">
                {PLAN_LIST.find((item) => item.id === plan)?.tagline ?? ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PLAN_LIST.map((item) => {
              const isCurrent = item.id === plan;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5",
                    isCurrent
                      ? "border-accent-border bg-accent-muted"
                      : "border-border bg-input",
                  )}
                >
                  <span className="text-caption font-medium text-foreground">
                    {item.name.replace("NOVA ", "")}
                  </span>
                  <span className="numeric text-caption text-subtle-foreground">
                    {item.price === 0 ? "0 ₽" : `${item.price} ₽`}
                  </span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-accent" />}
                </div>
              );
            })}
          </div>

          <Button asChild size="lg" variant="secondary">
            <Link href="/settings/subscription">Управление подпиской</Link>
          </Button>

          <p className="text-caption text-subtle-foreground">
            Сейчас доступен тариф{" "}
            {formatPrice(PLAN_LIST.find((item) => item.id === plan)?.price ?? 0).toLowerCase()}.
            Оплата платных тарифов ещё не подключена.
          </p>
        </div>
      </Card>
    </div>
  );
}
