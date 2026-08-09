"use client";

import { useState } from "react";
import { Moon } from "lucide-react";
import { useAddIntent } from "@/shared/lib/use-add-intent";
import { HealthSectionTabs } from "@/components/health-section-tabs";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { useSleep } from "@/features/sleep/hooks/use-sleep";
import { SleepTabs, type SleepTabId } from "@/features/sleep/components/sleep-tabs";
import { SleepSkeleton } from "@/features/sleep/components/sleep-skeleton";
import { SleepScoreCard } from "@/features/sleep/components/sleep-score-card";
import { SleepHistoryList } from "@/features/sleep/components/sleep-history-list";
import { SleepStatsCard } from "@/features/sleep/components/sleep-stats-card";
import { SleepLogModal } from "@/features/sleep/components/sleep-log-modal";
import { logOnDay } from "@/features/sleep/lib/stats";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * NOTE ON WHAT THIS SECTION DOES NOT DO. There is no bedtime reminder — that
 * needs the same Telegram send loop Workouts' note explains this app does not
 * have. And there are no sleep phases: no deep sleep, no REM. This app has no
 * wearable, so every one of those numbers would be invented (see lib/score.ts).
 *
 * The fixed eight-hour goal is gone. The target is now this person's own
 * trailing average once there are enough nights to mean anything, clamped to a
 * sane band — so a 7h sleeper stops being told they are failing every morning.
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

  /**
   * Arrived from the record sheet: open the night straight away rather than
   * landing on the screen and making the user find the button they just
   * pressed.
   *
   * Derived rather than pushed into state by an effect. It waits on `today`
   * because the form needs a day to write to, and it is cancelled by
   * `intentDismissed` so closing the sheet does not immediately reopen it.
   */
  const addIntent = useAddIntent();
  const [intentDismissed, setIntentDismissed] = useState(false);
  const isFormVisible =
    isFormOpen || (addIntent !== null && today !== null && !intentDismissed);

  return (
    <PageContainer className="flex flex-col gap-4">
      <HealthSectionTabs active="sleep" />

      <PageHeader
        title="Сон"
        subtitle="Часы сна и качество отдыха"
        actions={
          <Button size="icon" aria-label="Записать сон" onClick={() => openLog(todayLog)}>
            <Moon className="h-4 w-4" />
          </Button>
        }
      />

      {isPending && <SleepSkeleton />}

      {isError && (
        <EmptyState
          icon={<Moon className="h-5 w-5" />}
          title="Сон не загрузился"
          description="Проверь соединение — записи никуда не делись."
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

          {tab === "today" && (
            <SleepScoreCard logs={logs} today={today} onLog={() => openLog(todayLog)} />
          )}

          {tab === "history" && (
            <SleepHistoryList logs={logs} today={today} onOpen={(log) => openLog(log)} />
          )}

          {tab === "stats" && <SleepStatsCard logs={logs} today={today} />}
        </>
      )}

      <SleepLogModal
        key={`log-${formKey}`}
        log={editingLog ?? (isFormOpen ? null : todayLog)}
        day={today}
        today={today}
        open={isFormVisible}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setIntentDismissed(true);
        }}
        onSave={(draft) => upsertLog(draft)}
        onDelete={editingLog ? () => deleteLog(editingLog.id) : undefined}
      />
    </PageContainer>
  );
}
