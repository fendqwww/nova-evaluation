"use client";

import { Infinity as InfinityIcon, MessageSquare, Scan, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { USAGE_DISPLAY_ORDER, USAGE_LABELS, type UsageFeature } from "@/features/usage/constants";
import { formatDay, todayIn } from "@/shared/lib/calendar-day";
import type { FeatureUsage, UsageSnapshot } from "@/features/usage/types";

/**
 * Where the three AI allowances stand.
 *
 * One row per feature rather than the single shared counter this screen used to
 * show. The shared number was honest about the total and useless about the
 * decision: a user who wanted to photograph dinner could not tell whether the
 * budget was there, because the same figure was also the coach's. These are the
 * three questions people actually have — "могу ли я ещё спросить", "могу ли я
 * сфотографировать еду", "остался ли анализ внешности" — and each has its own
 * answer.
 *
 * Every row prints the *binding* window, resolved server-side (see
 * usage.service.ts). A FREE user's food row says "0 из 1 на этой неделе", not
 * "0 из 5 в этом месяце", because the week is what will refuse the next photo.
 */
export function AiUsageCard({ usage }: { usage: UsageSnapshot }) {
  return (
    <Card elevation="accent">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <IconChip tone="ai" size="md">
            <Sparkles className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">AI Usage</p>
            <p className="text-caption text-muted-foreground">
              Что осталось на текущем тарифе
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {USAGE_DISPLAY_ORDER.map((feature) => (
            <UsageRow key={feature} usage={usage[feature]} feature={feature} />
          ))}
        </div>
      </div>
    </Card>
  );
}

const FEATURE_ICON: Record<UsageFeature, LucideIcon> = {
  coach: MessageSquare,
  food: Scan,
  appearance: Sparkles,
};

/** "в этом месяце" / "на этой неделе" / "бесплатно" — what the numbers count. */
const WINDOW_NOTE: Record<FeatureUsage["window"], string> = {
  month: "в этом месяце",
  week: "на этой неделе",
  lifetime: "бесплатно",
};

function UsageRow({ usage, feature }: { usage: FeatureUsage; feature: UsageFeature }) {
  const Icon = FEATURE_ICON[feature];
  const label = USAGE_LABELS[feature];

  if (usage.limit === null) {
    return (
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-subtle-foreground" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-caption font-medium text-foreground">{label.title}</p>
          <p className="text-micro text-subtle-foreground">{label.hint}</p>
        </div>
        <InfinityIcon className="h-4 w-4 shrink-0 text-accent" />
      </div>
    );
  }

  // Clamped rather than trusted: a limit lowered mid-month (a lapsed PLUS
  // falling back to FREE) can leave a counter above its own ceiling, and a bar
  // wider than its track is a rendering bug on top of a billing event.
  const used = Math.min(usage.used, usage.limit);
  const ratio = usage.limit === 0 ? 1 : Math.min(1, usage.used / usage.limit);
  const exhausted = !usage.allowed;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            exhausted ? "text-subtle-foreground" : "text-muted-foreground",
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-caption font-medium text-foreground">{label.title}</p>
          <p className="text-micro text-subtle-foreground">{label.hint}</p>
        </div>
        <span className="numeric shrink-0 text-caption text-foreground">
          {used}
          <span className="text-subtle-foreground"> / {usage.limit}</span>
        </span>
      </div>

      <div className="ml-7 flex flex-col gap-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-fill-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              exhausted ? "bg-destructive" : "bg-accent",
            )}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <p className="text-micro text-subtle-foreground">
          {WINDOW_NOTE[usage.window]}
          {exhausted && <RenewalNote renewsOn={usage.renewsOn} />}
        </p>
      </div>
    </div>
  );
}

/**
 * When an exhausted allowance comes back — or that it does not.
 *
 * The date is formatted against the device's today rather than the server's
 * calendar day. This is a client component and has no timezone context; the
 * only thing `today` decides here is whether the year is printed, and the two
 * can differ by at most a day.
 */
function RenewalNote({ renewsOn }: { renewsOn: string | null }) {
  if (!renewsOn) return <> · бесплатный анализ уже использован</>;
  return <> · обновится {formatDay(renewsOn, todayIn("UTC"))}</>;
}
