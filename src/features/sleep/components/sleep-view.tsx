"use client";

import { useState } from "react";
import { Moon } from "lucide-react";
import { HealthSectionTabs } from "@/components/health-section-tabs";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { useSleep } from "@/features/sleep/hooks/use-sleep";
import { SleepTabs, type SleepTabId } from "@/features/sleep/components/sleep-tabs";
import { SleepSkeleton } from "@/features/sleep/components/sleep-skeleton";
import { SleepTodayCard } from "@/features/sleep/components/sleep-today-card";
import { SleepHistoryList } from "@/features/sleep/components/sleep-history-list";
import { SleepStatsCard } from "@/features/sleep/components/sleep-stats-card";
import { SleepLogModal } from "@/features/sleep/components/sleep-log-modal";
import { logOnDay } from "@/features/sleep/lib/stats";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * NOTE ON WHAT THIS SECTION DOES NOT DO. There is no user-configurable sleep
 * goal and no bedtime reminder. Eight hours is a fixed target — the same
 * pragmatic default this section's stats card measures every day against —
 * and a reminder needs the same Telegram send loop Workouts' note explains
 * this app does not have.
 */
export function SleepView() {
  const { logs, today, isPending, isError, retry, upsertLog, deleteLog } = useSleep();

  const [tab, setTab] = useState<SleepTabId>("today");
  const [editingLog, setEditingLog] = useState<SleepLogItem | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const hasLogs = logs.length > 0;
  const todayLog = today ? logOnDay(logs, today) : null;

  function openLog(log: SleepLogItem | null) {
    setEditingLog(log);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  return (
    <PageContainer className="flex flex-col gap-4">
      <HealthSectionTabs active="sleep" />

      <header className="flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">Сон</h1>
          <p className="text-caption text-muted-foreground">Часы сна и качество отдыха</p>
        </div>

        <Button size="icon" aria-label="Записать сон" onClick={() => openLog(todayLog)}>
          <Moon className="h-4 w-4" />
        </Button>
      </header>

      {isPending && <SleepSkeleton />}

      {isError && (
        <EmptyState
          icon={<Moon className="h-5 w-5" />}
          title="Не удалось загрузить сон"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && !hasLogs && (
        <EmptyState
          className="py-12"
          icon={<Moon className="h-5 w-5" />}
          title="Вы ещё не записывали сон"
          description="Отмечайте время сна и пробуждения каждое утро — здесь появятся часы, качество и история."
          action={
            <Button size="lg" onClick={() => openLog(null)}>
              Записать первую ночь
            </Button>
          }
        />
      )}

      {!isPending && !isError && hasLogs && (
        <>
          <SleepTabs tab={tab} onChange={setTab} />

          {tab === "today" && <SleepTodayCard log={todayLog} onLog={() => openLog(todayLog)} />}

          {tab === "history" && (
            <SleepHistoryList logs={logs} today={today} onOpen={(log) => openLog(log)} />
          )}

          {tab === "stats" && <SleepStatsCard logs={logs} today={today} />}
        </>
      )}

      <SleepLogModal
        key={`log-${formKey}`}
        log={editingLog}
        day={today}
        today={today}
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSave={(draft) => upsertLog(draft)}
        onDelete={editingLog ? () => deleteLog(editingLog.id) : undefined}
      />
    </PageContainer>
  );
}
