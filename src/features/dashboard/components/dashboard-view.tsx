"use client";

import { useState } from "react";
import { Target, Repeat, ListTodo, Sparkles } from "lucide-react";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { LifeScoreCard } from "@/features/dashboard/components/life-score-card";
import { FocusOfDayCard } from "@/features/dashboard/components/focus-of-day-card";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { CoachPreviewCard } from "@/features/dashboard/components/coach-preview-card";
import { ActivityOverviewCard } from "@/features/activity/components/activity-overview-card";
import { QuickCaptureModal } from "@/features/activity/components/quick-capture-modal";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { ActivityItemType } from "@/features/activity/types";

export function DashboardView() {
  const { data, isPending, isError, refresh, refetch } = useDashboardData();
  const [captureType, setCaptureType] = useState<ActivityItemType | null>(null);

  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        title="Не удалось загрузить дашборд"
        description="Проверьте соединение и попробуйте снова."
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            Повторить
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Reveal className="gap-3">
        <RevealItem>
          <DashboardHeader
            firstName={data.user.firstName}
            photoUrl={data.user.photoUrl}
            timezone={data.timezone}
          />
        </RevealItem>

        <RevealItem>
          <LifeScoreCard result={data.lifeScore} />
        </RevealItem>

        <RevealItem>
          <CoachPreviewCard coach={data.coach} />
        </RevealItem>

        <RevealItem>
          <FocusOfDayCard focus={data.focus} onCreateGoal={() => setCaptureType("goal")} />
        </RevealItem>

        <RevealItem>
          <QuickActions
            onGoal={() => setCaptureType("goal")}
            onHabit={() => setCaptureType("habit")}
            onTask={() => setCaptureType("task")}
          />
        </RevealItem>

        <RevealItem className="flex flex-col gap-2.5">
          <p className="text-section text-muted-foreground">Обзор активности</p>
          <div className="grid grid-cols-3 gap-2.5">
            <ActivityOverviewCard
              icon={<Target className="h-3.5 w-3.5" />}
              title="Цели"
              count={data.counts.goals}
              unitLabel={(n) => pluralizeRu(n, ["цель", "цели", "целей"])}
              tone="goal"
              onCreate={() => setCaptureType("goal")}
            />
            <ActivityOverviewCard
              icon={<Repeat className="h-3.5 w-3.5" />}
              title="Привычки"
              count={data.counts.habits}
              unitLabel={(n) => pluralizeRu(n, ["привычка", "привычки", "привычек"])}
              tone="habit"
              onCreate={() => setCaptureType("habit")}
            />
            <ActivityOverviewCard
              icon={<ListTodo className="h-3.5 w-3.5" />}
              title="Задачи"
              count={data.counts.tasks}
              unitLabel={(n) => pluralizeRu(n, ["задача", "задачи", "задач"])}
              tone="task"
              onCreate={() => setCaptureType("task")}
            />
          </div>
        </RevealItem>
      </Reveal>

      <QuickCaptureModal
        type={captureType ?? "goal"}
        open={captureType !== null}
        onOpenChange={(open) => !open && setCaptureType(null)}
        onCreated={refresh}
      />
    </>
  );
}
