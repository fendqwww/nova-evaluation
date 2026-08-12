"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Compass, ListTodo, Route, Target } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { haptics } from "@/shared/lib/haptics";
import type { ActiveItem } from "@/features/activity/types";
import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data.action";

/**
 * «Куда я иду» — маршрут Nova и собственный фокус человека в одной карточке.
 *
 * ЧТО ЭТО ЗАМЕНИЛО. Это были две отдельные карточки подряд, и разделяло их
 * настоящее различие: путь — маршрут, предложенный Nova, фокус — цель или
 * задача, которую человек поставил себе сам. Различие верное, но оно не стоит
 * второй карточки: обе отвечают на один вопрос «куда я иду», обе стоят внизу
 * главного экрана, и рядом друг с другом они читались как два одинаковых
 * прямоугольника, а не как маршрут и точка на нём.
 *
 * Теперь это один блок с разделителем: сверху маршрут с процентом и следующим
 * шагом, под чертой — фокус дня строкой. Различие сохранено композицией, а не
 * повторением карточки.
 *
 * ФОКУС СТАЛ ССЫЛКОЙ. В прежней карточке у строки фокуса была стрелка-шеврон и
 * не было перехода — украшение, обещавшее нажатие, которого не происходило.
 * Теперь строка ведёт в тот раздел, которому принадлежит: цель — в «Цели»,
 * задача — в «Задачи».
 */
export function DirectionCard({
  path,
  focus,
  onCreateGoal,
}: {
  path: DashboardData["path"];
  focus: ActiveItem | null;
  onCreateGoal: () => void;
}) {
  return (
    <Card elevation={path === null ? "accent" : "raised"}>
      <div className="flex flex-col">
        {path === null ? (
          // Пути нет — это самый важный вопрос на экране, и блок оформлен
          // приглашением, а не пустой карточкой. Всё остальное на главной
          // описывает сегодня; только здесь говорится, куда это ведёт.
          <div className="flex flex-col gap-3.5 p-4">
            <div className="flex items-start gap-3">
              <IconChip tone="accent" size="md">
                <Compass className="h-4 w-4" />
              </IconChip>

              <div className="min-w-0 flex-1">
                <p className="text-label uppercase text-muted-foreground">NOVA Path</p>
                <p className="mt-1.5 text-title text-foreground">Не знаешь, с чего начать?</p>
                <p className="mt-1 text-caption leading-snug text-muted-foreground">
                  Выбери цель — Nova построит маршрут по твоим данным и скажет, что делать
                  сегодня, а что через месяц.
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
        ) : (
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

              <span className="numeric shrink-0 text-page font-bold leading-none tracking-[-0.04em] text-foreground">
                {path.percent}%
              </span>
            </div>

            <Progress value={path.percent / 100} size="sm" label="Прогресс пути" />

            {path.nextStepTitle && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-fill-subtle p-2.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-label uppercase text-subtle-foreground">
                    Следующий шаг
                  </span>
                  <span className="truncate text-caption font-medium text-foreground">
                    {path.nextStepTitle}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
              </div>
            )}
          </Link>
        )}

        {/* Фокус дня — под чертой, всегда. Это вторая половина ответа «куда я
            иду»: маршрут выбрала Nova, фокус выбрал человек. */}
        {focus ? (
          <Link
            href={focus.type === "goal" ? "/goals" : "/tasks"}
            onClick={() => haptics.tap()}
            className="press-sm flex items-center gap-3 border-t border-border px-4 py-3.5 active:bg-fill-subtle"
          >
            <IconChip tone={focus.type === "goal" ? "goal" : "task"} size="sm">
              {focus.type === "goal" ? (
                <Target className="h-3.5 w-3.5" />
              ) : (
                <ListTodo className="h-3.5 w-3.5" />
              )}
            </IconChip>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label uppercase text-muted-foreground">
                Фокус дня · {focus.type === "goal" ? "цель" : "задача"}
              </span>
              <span className="truncate text-body font-medium text-foreground">{focus.title}</span>
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onCreateGoal();
            }}
            className="press-sm flex items-center gap-3 border-t border-border px-4 py-3.5 text-left active:bg-fill-subtle"
          >
            <IconChip tone="goal" size="sm">
              <Target className="h-3.5 w-3.5" />
            </IconChip>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label uppercase text-muted-foreground">Фокус дня</span>
              <span className="text-body font-medium text-foreground">Выбери фокус дня</span>
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
          </button>
        )}
      </div>
    </Card>
  );
}
