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
import { AiUsageCard } from "@/features/settings/components/ai-usage-card";
import { PLAN_LIST } from "@/features/settings/lib/plans";

/**
 * The NOVA tiers.
 *
 * Its own route rather than a modal: three full feature lists is a screen's
 * worth of reading, and a bottom sheet that fills the viewport is a page
 * wearing a costume. It also means the comparison is linkable, which is what a
 * pricing screen is for.
 *
 * Nothing here is enforced anywhere in the app. There is no billing, no
 * entitlement check and no feature that refuses to run on FREE — the notice at
 * the bottom says so, because a paywall screen that implies limits which do not
 * exist is the one kind of lie a settings section cannot afford.
 */
export function SubscriptionView() {
  const { settings, aiUsage, isPending, isError, retry } = useSettings();

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
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
            Подписка
          </h1>
          <p className="text-caption text-muted-foreground">
            Nova работает целиком на бесплатном тарифе. Платные — про AI, который
            видит и помнит.
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
          title="Не удалось загрузить тарифы"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && settings && aiUsage && (
        <>
          <AiUsageCard usage={aiUsage} />

          <div className="flex flex-col gap-4">
            {PLAN_LIST.map((plan) => (
              <PlanCard key={plan.id} plan={plan} current={settings.plan} />
            ))}
          </div>

          <Card elevation="inset">
            <p className="p-4 text-caption text-muted-foreground">
              Оплата пока не подключена: деньги не списываются, тариф не меняется, а
              все функции Nova доступны в рамках NOVA FREE. Когда подписки заработают,
              вы увидите это здесь первым.
            </p>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
