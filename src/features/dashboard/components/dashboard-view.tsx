"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Target, Repeat, ListTodo } from "lucide-react";
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
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { ActivityItemType } from "@/features/activity/types";

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function DashboardView() {
  const { data, isPending, isError, refresh, refetch } = useDashboardData();
  const [captureType, setCaptureType] = useState<ActivityItemType | null>(null);

  if (isPending) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div>
          <p className="text-heading text-foreground">Не удалось загрузить дашборд</p>
          <p className="mt-1 text-caption text-muted-foreground">Проверьте соединение и попробуйте снова.</p>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3"
      >
        <motion.div variants={itemVariants}>
          <DashboardHeader
            firstName={data.user.firstName}
            photoUrl={data.user.photoUrl}
            timezone={data.timezone}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <LifeScoreCard result={data.lifeScore} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <CoachPreviewCard coach={data.coach} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FocusOfDayCard focus={data.focus} onCreateGoal={() => setCaptureType("goal")} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <QuickActions
            onGoal={() => setCaptureType("goal")}
            onHabit={() => setCaptureType("habit")}
            onTask={() => setCaptureType("task")}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-2.5">
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
        </motion.div>
      </motion.div>

      <QuickCaptureModal
        type={captureType ?? "goal"}
        open={captureType !== null}
        onOpenChange={(open) => !open && setCaptureType(null)}
        onCreated={refresh}
      />
    </>
  );
}
