"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { Skeleton } from "@/shared/ui/skeleton";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { PlanCard } from "@/features/settings/components/plan-card";
import { AiUsageCard } from "@/features/usage/components/ai-usage-card";
import { PLAN_LIST } from "@/features/settings/lib/plans";
import {
  SUPPORT_LINK,
  SUPPORT_USERNAME,
  accountHandle,
  planRequestLink,
} from "@/features/settings/lib/support";

/**
 * The NOVA tiers.
 *
 * Its own route rather than a modal: three full feature lists is a screen's
 * worth of reading, and a bottom sheet that fills the viewport is a page
 * wearing a costume. It also means the comparison is linkable, which is what a
 * pricing screen is for.
 *
 * What is genuinely enforced here are the three AI allowances, in
 * features/usage — every number on the tier cards below is formatted from the
 * same ceilings the server checks. That is why the usage card sits above the
 * tiers rather than in the AI settings group: it is the thing being sold, so it
 * belongs next to the price.
 *
 * There is no payment provider yet, and the tiers are sold by talking to us.
 * The notice at the bottom says exactly that: a screen that promised checkout
 * would be lying, and one that said "скоро" would be lying in the other
 * direction, because the tier is real and can be activated today.
 */
export function SubscriptionView() {
  const { account, settings, usage, isPending, isError, retry } = useSettings();

  return (
    <PageContainer className="flex flex-col gap-5">
      <header className="flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] flex-col gap-3">
        <Link
          href="/settings"
          className="press-sm flex w-fit items-center gap-1.5 text-caption text-muted-foreground active:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Настройки
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-page text-foreground">Подписка</h1>
          <p className="text-caption text-muted-foreground">
            Nova работает целиком на бесплатном тарифе. Платные расширяют лимиты AI —
            коуча, анализа еды и внешности.
          </p>
        </div>
      </header>

      {isPending && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Тарифы не загрузились"
          description="Проверь соединение — данные никуда не делись."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {/* `account` joins the guard because the tier buttons and the contact
          line both address the user by handle — all three fields come from the
          same snapshot, so this narrows them together instead of leaving a
          sentence that can render as "Ваш аккаунт для связи — ." */}
      {!isPending && !isError && settings && usage && account && (
        <>
          <AiUsageCard usage={usage} />

          <div className="flex flex-col gap-4">
            {PLAN_LIST.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={settings.plan}
                planUntil={settings.planUntil}
                // FREE is nobody's upgrade, so it gets no button. Every paid
                // tier gets a link that opens the support bot already on the
                // payment branch — the bot resolves who is asking by itself.
                href={plan.id === "free" ? null : planRequestLink(plan.id)}
              />
            ))}
          </div>

          <Card elevation="inset">
            <div className="flex flex-col gap-2 p-4">
              <p className="text-caption text-foreground">
                PLUS доступен. Для активации свяжитесь с нами.
              </p>
              <p className="text-caption text-muted-foreground">
                Автоматической оплаты пока нет: напишите в{" "}
                <a
                  href={SUPPORT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent underline underline-offset-2"
                >
                  @{SUPPORT_USERNAME}
                </a>
                , и мы включим тариф вручную сразу после оплаты. Ваш аккаунт для связи —{" "}
                <span className="text-foreground">{accountHandle(account)}</span>.
              </p>
            </div>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
