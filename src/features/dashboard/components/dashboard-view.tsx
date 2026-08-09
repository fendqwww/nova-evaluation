"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { NovaScoreCard } from "@/features/dashboard/components/nova-score-card";
import { TodayGrid } from "@/features/dashboard/components/today-grid";
import { FocusOfDayCard } from "@/features/dashboard/components/focus-of-day-card";
import { CoachPreviewCard } from "@/features/dashboard/components/coach-preview-card";
import { QuickCaptureModal } from "@/features/activity/components/quick-capture-modal";
import { AsyncSection } from "@/shared/ui/async-section";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import type { ActivityItemType } from "@/features/activity/types";

/**
 * The home screen, rebuilt around the body rather than around a to-do list.
 *
 * The order is the argument, the same way it is on the Coach screen. The
 * greeting carries the day's verdict, the score answers "how am I doing", the
 * four tiles answer "what have I actually done today", and the Coach — which
 * has read all of it — gets the full-width ask button. The focus of the day
 * comes last because a single goal or task is the smallest claim on the screen.
 *
 * What left: the three "Обзор активности" tiles that counted goals, habits and
 * tasks, and the 2×2 "Быстрые действия" grid. Both were shortcuts to creating
 * entities, and both are now served better by the record button in the tab bar,
 * which is reachable from every screen rather than only from this one.
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
          <Reveal className="gap-4">
            <RevealItem>
              <DashboardHeader
                firstName={data.user.firstName}
                photoUrl={data.user.photoUrl}
                timezone={data.timezone}
                status={data.coach.headline}
              />
            </RevealItem>

            <RevealItem>
              <NovaScoreCard result={data.lifeScore} />
            </RevealItem>

            <RevealItem>
              <TodayGrid health={data.todayHealth} />
            </RevealItem>

            <RevealItem>
              <CoachPreviewCard coach={data.coach} />
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
