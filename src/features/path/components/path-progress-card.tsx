"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { PATH_GOAL_KIND_META } from "@/features/path/lib/goal-kinds";
import { stepActionLabel, stepHref } from "@/features/path/lib/goal-kinds";
import { stageCaption, type PathProgress } from "@/features/path/lib/progress";
import type { PathItem } from "@/features/path/types";

/**
 * Шапка пути: где человек сейчас и что делать следующим.
 *
 * ПОРЯДОК ЧТЕНИЯ ЗДЕСЬ — ЭТО ОТВЕТ НА ТРИ ВОПРОСА, И ТОЛЬКО В ЭТОМ ПОРЯДКЕ:
 *
 *   1. Куда я иду        → цель словами и, когда она измерима, «82 → 75 кг»
 *   2. Где я сейчас      → процент, полоса и номер этапа
 *   3. Что делать сейчас → один следующий шаг, с кнопкой в нужный раздел
 *
 * Третий пункт — причина существования всего экрана. План без «сделай это
 * сейчас» — это документ, а не наставник, и именно поэтому следующий шаг стоит
 * не в списке ниже, а здесь, наверху, отдельным блоком с кнопкой.
 *
 * Процент берётся из результата, когда результат измерим, и из шагов, когда нет
 * (см. lib/progress.ts). Разница принципиальна: человек, закрывший все шаги и не
 * сдвинувший вес, не должен читать «100%».
 */
export function PathProgressCard({
  path,
  progress,
}: {
  path: PathItem;
  progress: PathProgress;
}) {
  const meta = PATH_GOAL_KIND_META[path.goalKind];
  const Icon = meta.icon;
  const { measure, nextStep } = progress;

  const nextHref = nextStep ? stepHref(nextStep.target) : null;
  const nextLabel = nextStep ? stepActionLabel(nextStep.target) : null;

  return (
    <Card elevation="lifted">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <IconChip tone={meta.tone} size="lg">
            <Icon className="h-5 w-5" />
          </IconChip>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-label uppercase text-muted-foreground">Мой путь</p>
            <p className="text-title text-foreground">{path.title}</p>
            {measure && (
              <p className="numeric text-caption text-muted-foreground">
                {format(measure.start)} → {format(measure.target)} {unitLabel(measure.unit)}
                {measure.passed > 0 && (
                  <span className="text-positive"> · пройдено {format(measure.passed)}</span>
                )}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end">
            <span className="numeric text-[1.75rem] font-bold leading-none tracking-[-0.04em] text-foreground">
              {progress.percent}%
            </span>
            <span className="text-[0.6875rem] text-subtle-foreground">
              {progress.stepsDone} из {progress.stepsTotal} шагов
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Progress value={progress.ratio} size="lg" label="Прогресс пути" />
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-caption text-muted-foreground">{stageCaption(progress)}</span>
            {measure && measure.remaining > 0 && (
              <span className="numeric text-caption text-muted-foreground">
                осталось {format(measure.remaining)} {unitLabel(measure.unit)}
              </span>
            )}
          </div>
        </div>

        {/* Почему план такой. Отдельной подложкой: выше — состояние, здесь —
            объяснение, и это разные рода высказывания. */}
        <div className="flex items-start gap-2 rounded-xl border border-border bg-fill-subtle p-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p className="text-caption leading-snug text-muted-foreground">{path.summary}</p>
        </div>

        {/* Следующий шаг — то единственное, зачем открывают этот экран. */}
        {nextStep ? (
          <div className="flex flex-col gap-2.5 rounded-xl border border-accent-border bg-accent-soft p-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-label uppercase text-accent">Следующий шаг</p>
              <p className="text-body font-medium text-foreground">{nextStep.title}</p>
              {nextStep.hint && (
                <p className="text-caption text-muted-foreground">{nextStep.hint}</p>
              )}
            </div>

            {nextHref && nextLabel && (
              <Button asChild size="md" className="group w-full font-semibold">
                <Link href={nextHref} onClick={() => haptics.tap()}>
                  {nextLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-active:translate-x-0.5" />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <p
            className={cn(
              "rounded-xl border border-border bg-fill-subtle p-3 text-caption",
              "text-foreground",
            )}
          >
            Все шаги закрыты. Отметь путь пройденным или выбери следующую цель.
          </p>
        )}
      </div>
    </Card>
  );
}

function format(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function unitLabel(unit: string): string {
  return unit === "kg" ? "кг" : unit;
}
