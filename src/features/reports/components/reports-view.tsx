"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { useReports } from "@/features/reports/hooks/use-reports";
import { ReportsSkeleton } from "@/features/reports/components/reports-skeleton";
import { PeriodToggle, type ReportsPeriod } from "@/features/reports/components/period-toggle";
import { ReportsAiSummaryCard } from "@/features/reports/components/reports-ai-summary-card";
import { ReportsHabitsCard } from "@/features/reports/components/reports-habits-card";
import { ReportsGoalsCard } from "@/features/reports/components/reports-goals-card";
import { ReportsNutritionCard } from "@/features/reports/components/reports-nutrition-card";
import { ReportsSleepCard } from "@/features/reports/components/reports-sleep-card";
import { ReportsWorkoutsCard } from "@/features/reports/components/reports-workouts-card";
import { ReportsWeightCard } from "@/features/reports/components/reports-weight-card";
import { ReportsAppearanceCard } from "@/features/reports/components/reports-appearance-card";
import { LifeScoreCard } from "@/features/dashboard/components/life-score-card";

const WEEK_DAYS = 7;

export function ReportsView() {
  const { reports, isPending, isError, retry, generateAiSummary, isGeneratingAiSummary } = useReports();
  const [period, setPeriod] = useState<ReportsPeriod>("week");

  const windowed = useMemo(() => {
    if (!reports) return null;
    const series = period === "week" ? reports.series.slice(-WEEK_DAYS) : reports.series;
    return {
      habits: series.map((point) => ({ day: point.day, value: point.habitsDone })),
      workoutVolume: series.map((point) => ({ day: point.day, value: point.workoutVolumeKg })),
      calories: series.map((point) => ({ day: point.day, value: point.nutritionCalories })),
      water: series.map((point) => ({ day: point.day, value: point.waterMl })),
      sleep: series.map((point) => ({ day: point.day, value: point.sleepDurationMin })),
    };
  }, [reports, period]);

  return (
    <PageContainer className="flex flex-col gap-4">
      <header className="flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] flex-col gap-0.5">
        <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">Отчёты</h1>
        <p className="text-caption text-muted-foreground">Прогресс по всем сферам за 30 дней</p>
      </header>

      {isPending && <ReportsSkeleton />}

      {isError && (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="Не удалось загрузить отчёт"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && reports && windowed && (
        <Reveal className="gap-4">
          <RevealItem>
            <PeriodToggle period={period} onChange={setPeriod} />
          </RevealItem>

          <RevealItem>
            <LifeScoreCard result={reports.lifeScore} />
          </RevealItem>

          <RevealItem>
            <ReportsAiSummaryCard
              summary={reports.aiSummary}
              aiUsage={reports.aiUsage}
              onGenerate={generateAiSummary}
              isGenerating={isGeneratingAiSummary}
            />
          </RevealItem>

          <RevealItem>
            <ReportsHabitsCard habits={reports.habits} series={windowed.habits} today={reports.today} />
          </RevealItem>

          <RevealItem>
            <ReportsGoalsCard goals={reports.goals} />
          </RevealItem>

          <RevealItem>
            <ReportsWorkoutsCard
              workouts={reports.workouts}
              series={windowed.workoutVolume}
              today={reports.today}
            />
          </RevealItem>

          <RevealItem>
            <ReportsNutritionCard
              nutrition={reports.nutrition}
              calorieSeries={windowed.calories}
              waterSeries={windowed.water}
              today={reports.today}
            />
          </RevealItem>

          <RevealItem>
            <ReportsSleepCard sleep={reports.sleep} series={windowed.sleep} today={reports.today} />
          </RevealItem>

          <RevealItem>
            <ReportsWeightCard profile={reports.profile} />
          </RevealItem>

          <RevealItem>
            <ReportsAppearanceCard appearance={reports.appearance} />
          </RevealItem>
        </Reveal>
      )}
    </PageContainer>
  );
}
