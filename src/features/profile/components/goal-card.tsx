"use client";

import Link from "next/link";
import { ArrowRight, Compass, Target } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { haptics } from "@/shared/lib/haptics";
import type { ProfilePathSummary } from "@/features/profile/types";

/**
 * «Моя цель» — то, чего на этом экране не было вовсе.
 *
 * Профиль показывал счёт, серию, итоги за всё время, график активности и полку
 * достижений — то есть исчерпывающе отвечал на вопрос «что я уже сделал» и ни
 * строкой не отвечал на «куда я иду». Для продукта, который обещает довести
 * человека от точки А к результату, это была самая заметная дырка в экране,
 * который человек открывает, чтобы посмотреть на себя.
 *
 * Стоит сразу под карточкой тела, потому что вместе они и есть ответ: вот твои
 * цифры, вот куда они двигаются.
 */
export function ProfileGoalCard({ path }: { path: ProfilePathSummary | null }) {
  if (path === null) {
    return (
      <Card elevation="accent">
        <div className="flex items-center gap-3 p-4">
          <IconChip tone="accent" size="md">
            <Compass className="h-4 w-4" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <p className="text-label uppercase text-muted-foreground">Моя цель</p>
            <p className="mt-0.5 text-body font-medium text-foreground">Цель ещё не выбрана</p>
            <p className="text-caption text-muted-foreground">
              Nova построит маршрут по твоим данным
            </p>
          </div>

          <Button asChild size="sm" className="shrink-0">
            <Link href="/path?add=1" onClick={() => haptics.tap()}>
              Выбрать
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card interactive>
      <Link href="/path" onClick={() => haptics.tap()} className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <IconChip tone="goal" size="md">
            <Target className="h-4 w-4" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <p className="text-label uppercase text-muted-foreground">Моя цель</p>
            <p className="mt-0.5 truncate text-title text-foreground">{path.title}</p>
            <p className="numeric text-caption text-muted-foreground">
              {path.measureCaption ?? `План на ${path.horizonDays} дней`}
            </p>
          </div>

          <span className="numeric shrink-0 text-[1.375rem] font-bold leading-none tracking-[-0.04em] text-foreground">
            {path.percent}%
          </span>
        </div>

        <Progress value={path.percent / 100} size="sm" label="Прогресс цели" />

        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-caption text-muted-foreground">{path.stageCaption}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
        </div>
      </Link>
    </Card>
  );
}
