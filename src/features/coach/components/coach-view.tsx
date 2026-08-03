"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { formatDay } from "@/shared/lib/calendar-day";
import { useCoach } from "@/features/coach/hooks/use-coach";
import { CoachBriefCard } from "@/features/coach/components/coach-brief-card";
import { CoachSignalsCard } from "@/features/coach/components/coach-signals-card";
import { CoachReportCard } from "@/features/coach/components/coach-report-card";
import { CoachChat } from "@/features/coach/components/coach-chat";
import { CoachComposer } from "@/features/coach/components/coach-composer";
import { CoachQuickActions } from "@/features/coach/components/coach-quick-actions";
import { CoachSkeleton } from "@/features/coach/components/coach-skeleton";

/**
 * The Coach screen: today's analysis first, then the conversation.
 *
 * The order is the argument. A chat box at the top would make this a place you
 * have to think of a question for; leading with the day's verdict, the standing
 * signals and the day-over-day report means the screen has already said
 * something useful before the user types anything — and the chat below is for
 * following up on what it said.
 */
export function CoachView() {
  const {
    overview,
    isDisabled,
    isPending,
    isError,
    retry,
    pendingQuestion,
    isAnswering,
    askFailed,
    ask,
    canLoadEarlier,
    isLoadingEarlier,
    loadEarlier,
  } = useCoach();

  if (isPending) {
    return (
      <PageContainer className="flex flex-col gap-4">
        <CoachSkeleton />
      </PageContainer>
    );
  }

  // Switched off in Настройки. Nothing was computed and nothing was sent, so
  // this is the whole screen — with the way back to the switch that caused it.
  if (isDisabled) {
    return (
      <PageContainer className="flex flex-col gap-4">
        <EmptyState
          className="py-16"
          icon={<Sparkles className="h-5 w-5" />}
          title="AI Coach выключен"
          description="Nova не анализирует твои данные и ничего не отправляет наружу. Включить можно в настройках."
          action={
            <Button asChild variant="secondary">
              <Link href="/settings">Открыть настройки</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (isError || !overview) {
    return (
      <PageContainer className="flex flex-col gap-4">
        <EmptyState
          className="py-16"
          icon={<Sparkles className="h-5 w-5" />}
          title="Коуч недоступен"
          description="Не удалось собрать анализ по твоим данным. Проверь соединение и попробуй снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-4">
      <Reveal className="gap-4">
        <RevealItem className="flex flex-col gap-1">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
            Коуч Nova
          </h1>
          <p className="text-caption text-muted-foreground">
            {overview.greeting} · {formatDay(overview.today, overview.today)}
          </p>
        </RevealItem>

        <RevealItem>
          <CoachBriefCard analysis={overview.analysis} brief={overview.brief} />
        </RevealItem>

        <RevealItem>
          <CoachSignalsCard signals={overview.signals} />
        </RevealItem>

        <RevealItem>
          <CoachReportCard report={overview.report} />
        </RevealItem>

        <RevealItem className="flex flex-col gap-3 pt-1">
          <p className="text-section text-muted-foreground">Диалог</p>

          <CoachChat
            history={overview.history}
            today={overview.today}
            pendingQuestion={pendingQuestion}
            isAnswering={isAnswering}
            askFailed={askFailed}
            canLoadEarlier={canLoadEarlier}
            isLoadingEarlier={isLoadingEarlier}
            onLoadEarlier={loadEarlier}
          />
        </RevealItem>
      </Reveal>

      {/* Composer and chips sit outside the stagger so they are usable on the
          first frame rather than fading in behind the analysis above them. */}
      <div className="sticky bottom-[calc(var(--bottom-nav-height)+var(--app-safe-bottom))] -mx-4 flex flex-col gap-2.5 border-t border-border glass-panel px-4 pb-3 pt-3">
        <CoachQuickActions
          disabled={isAnswering}
          onSelect={(question, intent) => ask(question, intent)}
        />
        <CoachComposer disabled={isAnswering} onSend={(question) => ask(question, null)} />
      </div>
    </PageContainer>
  );
}
