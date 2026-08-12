"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { SampleMenuCard } from "@/features/nutrition/components/sample-menu-card";
import { ScenarioCard } from "@/features/nutrition/components/scenario-card";
import { scenarioFor, scenarioWeekIndex } from "@/features/nutrition/lib/scenarios";
import {
  inferAim,
  totalDailyEnergyExpenditure,
  type ActivityLevel,
} from "@/features/nutrition/lib/targets";
import type { QuickMealTemplate } from "@/features/nutrition/lib/quick-templates";

/**
 * Вкладка «План» — единственное место, где раздел говорит не про сегодня.
 *
 * Три ответа подряд, и порядок здесь такой же аргумент, как на главном экране:
 *
 *   1. Куда это идёт      → сценарий на четыре недели
 *   2. Что есть сегодня   → примерное меню под норму
 *
 * Сценарий стоит первым, хотя меню полезнее прямо сейчас. Меню без сценария —
 * просто ещё один список блюд, каких в приложении и так два; сценарий объясняет,
 * почему меню выглядит именно так (на дефиците много белка, на наборе плотный
 * перекус), и без него человек читает раскладку как чужое мнение.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Кнопки «применить план на неделю». Записать за человека семь
 * дней вперёд означает наполнить дневник едой, которую он не ел, и убить
 * единственный смысл дневника — быть записью того, что было. Меню записывается
 * строка за строкой, в тот момент, когда человек действительно поел.
 */
export function NutritionPlanTab({
  body,
  caloriesGoal,
  proteinGoal,
  goalStartedAt,
  onOpenGoalForm,
  onApplyTemplate,
}: {
  /** Тело из профиля. null — онбординг не пройден или профиля нет. */
  body: {
    age: number;
    heightCm: number;
    weightKg: number;
    gender: string;
    activity: ActivityLevel | null;
  } | null;
  caloriesGoal: number;
  proteinGoal: number;
  goalStartedAt: string | null;
  onOpenGoalForm: () => void;
  onApplyTemplate: (template: QuickMealTemplate) => Promise<unknown>;
}) {
  // Цель выводится из нормы против поддержания, а не хранится отдельно — см.
  // inferAim. Поэтому для неё нужно тело: без активности TDEE не посчитать.
  const tdee =
    body && body.activity
      ? totalDailyEnergyExpenditure({ ...body, activity: body.activity })
      : 0;

  const aim = inferAim(caloriesGoal, tdee);

  // Пока нормы нет, показывать нечего и врать нечем: и меню, и сценарий целиком
  // выводятся из неё. Единственное осмысленное действие — посчитать норму, и
  // форма для этого уже есть.
  if (aim === null) {
    return (
      <EmptyState
        className="py-10"
        icon={<Sparkles className="h-5 w-5" />}
        title="Сначала — дневная норма"
        description="Nova посчитает калории и БЖУ по вашему телу и цели, а потом соберёт под них меню и сценарий на четыре недели."
        action={
          <Button size="lg" onClick={onOpenGoalForm}>
            Посчитать норму
          </Button>
        }
      />
    );
  }

  const scenario = scenarioFor(aim);
  const currentWeek =
    goalStartedAt === null
      ? 0
      : scenarioWeekIndex(new Date(goalStartedAt), new Date(), scenario.weeks.length);

  return (
    <div className="flex flex-col gap-6">
      <ScenarioCard aim={aim} currentWeek={currentWeek} />

      <SampleMenuCard
        aim={aim}
        calories={caloriesGoal}
        proteinG={proteinGoal}
        onApply={onApplyTemplate}
      />

      {/* Норма — основание обоих блоков выше, поэтому путь к её правке лежит
          здесь же, а не только в шестерёнке в шапке: человек, которому меню не
          подошло по калориям, чинит не меню. */}
      <Card elevation="inset">
        <div className="flex items-center justify-between gap-3 p-3.5">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">
              Меню и сценарий собраны под норму {caloriesGoal} ккал
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={onOpenGoalForm}>
            Изменить
          </Button>
        </div>
      </Card>
    </div>
  );
}
