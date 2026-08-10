"use client";

import Link from "next/link";
import { ArrowRight, Compass, Route } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { haptics } from "@/shared/lib/haptics";
import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data.action";

/**
 * Путь на главном экране — в двух состояниях, и второе важнее первого.
 *
 * НЕТ ПУТИ. Это тот самый блок «не знаешь, с чего начать»: человек, открывший
 * приложение впервые, видит четыре показателя состояния, план дня и разбор
 * коуча — и всё это описывает сегодня. Ни одно из них не отвечает на вопрос
 * «а куда я вообще иду». Пока пути нет, этот вопрос — самый важный на экране,
 * поэтому блок оформлен как приглашение, а не как пустая карточка.
 *
 * ЕСТЬ ПУТЬ. Тогда карточка показывает ровно три вещи: этап, процент и
 * следующий шаг. Полного списка этапов здесь нет намеренно — главный экран
 * отвечает на «что делать сейчас», а маршрут целиком читают на своём экране.
 *
 * Кнопка ведёт на `/path?add=1`: визард принадлежит экрану пути, и открывать его
 * модалкой с главной означало бы, что состояние формы живёт в двух местах — та
 * же причина, по которой лист записи навигирует интентом, а не открывает чужие
 * формы сам.
 */
export function PathCard({ path }: { path: DashboardData["path"] }) {
  if (path === null) {
    return (
      <Card elevation="accent">
        <div className="flex flex-col gap-3.5 p-4">
          <div className="flex items-start gap-3">
            <IconChip tone="accent" size="md">
              <Compass className="h-4 w-4" />
            </IconChip>

            <div className="min-w-0 flex-1">
              <p className="text-label uppercase text-muted-foreground">NOVA Path</p>
              <p className="mt-1.5 text-title text-foreground">Не знаешь, с чего начать?</p>
              <p className="mt-1 text-caption leading-snug text-muted-foreground">
                Выбери цель — Nova построит маршрут по твоим данным и скажет, что делать сегодня,
                а что через месяц.
              </p>
            </div>
          </div>

          <Button asChild size="lg" className="group w-full font-semibold">
            <Link href="/path?add=1" onClick={() => haptics.tap()}>
              Создать мой путь
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-active:translate-x-0.5" />
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
          <IconChip tone="accent" size="md">
            <Route className="h-4 w-4" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <p className="text-label uppercase text-muted-foreground">Мой путь</p>
            <p className="mt-0.5 truncate text-title text-foreground">{path.title}</p>
            <p className="text-caption text-muted-foreground">{path.stageCaption}</p>
          </div>

          <span className="numeric shrink-0 text-[1.375rem] font-bold leading-none tracking-[-0.04em] text-foreground">
            {path.percent}%
          </span>
        </div>

        <Progress value={path.percent / 100} size="sm" label="Прогресс пути" />

        {path.nextStepTitle && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-fill-subtle p-2.5">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label uppercase text-subtle-foreground">Следующий шаг</span>
              <span className="truncate text-caption font-medium text-foreground">
                {path.nextStepTitle}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
          </div>
        )}
      </Link>
    </Card>
  );
}
