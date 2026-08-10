"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { NovaScoreCard } from "@/features/dashboard/components/nova-score-card";
import { TodayPlanCard } from "@/features/dashboard/components/today-plan-card";
import { PathCard } from "@/features/dashboard/components/path-card";
import { FocusOfDayCard } from "@/features/dashboard/components/focus-of-day-card";
import { CoachPreviewCard } from "@/features/dashboard/components/coach-preview-card";
import { QuickCaptureModal } from "@/features/activity/components/quick-capture-modal";
import { AsyncSection } from "@/shared/ui/async-section";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import type { ActivityItemType } from "@/features/activity/types";

/**
 * «Сегодня» — Daily Command Center.
 *
 * ПОРЯДОК ЗДЕСЬ И ЕСТЬ АРГУМЕНТ, и он отвечает на пять вопросов подряд:
 *
 *   1. Как я сегодня?      → шапка с выводом Nova
 *   2. Насколько всё в норме? → NOVA Score и четыре состояния организма под ним
 *   3. Что дальше?         → план дня по часам
 *   4. Почему и что делать?→ разбор коуча с кнопкой в нужный раздел
 *   5. Куда я иду?         → путь: этап, процент и следующий шаг
 *
 * ЧТО ИЗМЕНИЛОСЬ В ЭТОЙ ВЕРСИИ И ПОЧЕМУ.
 *
 * Индекс вернулся наверх, но не таким, каким уходил вниз. Раньше выбор был между
 * «открыть экран абстрактным числом 82» и «открыть четырьмя состояниями тела» —
 * и второе было честнее, потому что 82 требует объяснения. Теперь выбирать не
 * нужно: число и состояния живут в одной карточке, число сверху, объяснение под
 * ним, каждый показатель по-прежнему открывает свой разбор. Вопрос «что значит
 * 82» получает ответ на том же экране, а не в модалке.
 *
 * Карточка пути — новый и последний блок. Она стоит внизу, потому что путь
 * отвечает на вопрос месяца, а не дня: человек, открывший приложение утром,
 * сначала должен узнать, что делать сегодня. Но она не может отсутствовать
 * вовсе — без неё экран целиком описывает сегодня и ни строкой не говорит, куда
 * это ведёт. Пока пути нет, на её месте приглашение его создать.
 *
 * «Фокус дня» остался под путём. Это разные вещи, несмотря на внешнее сходство:
 * путь — маршрут, предложенный Nova, фокус — цель или задача, которую человек
 * поставил себе сам, и вторая не перестаёт существовать от появления первого.
 */
export function DashboardView() {
  const { data, isPending, isError, refresh, refetch } = useDashboardData();
  const [captureType, setCaptureType] = useState<ActivityItemType | null>(null);

  return (
    <>
      <AsyncSection
        isPending={isPending}
        isError={isError || !data}
        skeleton={<DashboardSkeleton />}
        onRetry={() => refetch()}
        icon={<Sparkles className="h-5 w-5" />}
        errorTitle="Дашборд не загрузился"
      >
        {data && (
          <Reveal className="gap-5">
            <RevealItem>
              <DashboardHeader
                firstName={data.user.firstName}
                photoUrl={data.user.photoUrl}
                timezone={data.timezone}
                summary={data.healthSummary}
              />
            </RevealItem>

            <RevealItem>
              <NovaScoreCard result={data.lifeScore} health={data.health} />
            </RevealItem>

            <RevealItem>
              <TodayPlanCard items={data.plan} />
            </RevealItem>

            <RevealItem>
              <CoachPreviewCard coach={data.coach} />
            </RevealItem>

            <RevealItem>
              <PathCard path={data.path} />
            </RevealItem>

            <RevealItem>
              <FocusOfDayCard
                focus={data.focus}
                onCreateGoal={() => setCaptureType("goal")}
              />
            </RevealItem>
          </Reveal>
        )}
      </AsyncSection>

      <QuickCaptureModal
        type={captureType ?? "goal"}
        open={captureType !== null}
        onOpenChange={(open) => !open && setCaptureType(null)}
        onCreated={refresh}
      />
    </>
  );
}
