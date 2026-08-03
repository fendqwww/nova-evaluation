"use client";

import { Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { AiUsageStatus } from "@/features/settings/types";

/**
 * The shared AI budget (see ai/limits.ts), read plainly: one daily counter
 * across Coach, food-photo and appearance-photo analysis alike — not three
 * separate ceilings. FREE gets a fill bar against today's allowance; PLUS/MAX
 * get the infinity badge instead of a bar with nothing to measure.
 *
 * "Сегодня" is load-bearing in the copy: an exhausted budget here is a state
 * that ends tomorrow morning, and saying so is the difference between a limit
 * and a dead end.
 */
export function AiUsageCard({ usage }: { usage: AiUsageStatus }) {
  if (usage.limit === null) {
    return (
      <Card elevation="accent">
        <div className="flex items-center gap-3 p-4">
          <IconChip tone="ai" size="md">
            <InfinityIcon className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">AI без ограничений</p>
            <p className="text-caption text-muted-foreground">
              Коуч, анализ еды и внешности — без лимита запросов
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const remaining = Math.max(0, usage.limit - usage.used);
  const ratio = usage.limit === 0 ? 1 : Math.min(1, usage.used / usage.limit);
  const exhausted = remaining <= 0;

  return (
    <Card elevation={exhausted ? "raised" : "accent"}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <IconChip tone="ai" size="md">
            <Sparkles className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">AI-запросы сегодня</p>
            <p className="text-caption text-muted-foreground">
              Коуч, анализ еды и внешности — общий счётчик
            </p>
          </div>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="numeric text-title text-foreground">
              {remaining}
              <span className="text-caption font-normal text-subtle-foreground"> из {usage.limit}</span>
            </span>
            <span className="text-[0.6875rem] text-subtle-foreground">осталось</span>
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              exhausted ? "bg-destructive" : "bg-accent",
            )}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>

        {exhausted && (
          <p className="text-caption text-muted-foreground">
            Дневной лимит исчерпан — новые запросы будут доступны завтра. NOVA PLUS снимает
            ограничение совсем.
          </p>
        )}
      </div>
    </Card>
  );
}
