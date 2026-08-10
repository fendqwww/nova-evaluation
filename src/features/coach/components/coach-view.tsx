"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { formatDay } from "@/shared/lib/calendar-day";
import { haptics } from "@/shared/lib/haptics";
import { useCoach } from "@/features/coach/hooks/use-coach";
import { CoachBriefCard } from "@/features/coach/components/coach-brief-card";
import { CoachSignalsCard } from "@/features/coach/components/coach-signals-card";
import { CoachReportCard } from "@/features/coach/components/coach-report-card";
import { CoachChatSheet } from "@/features/coach/components/coach-chat-sheet";
import { CoachSkeleton } from "@/features/coach/components/coach-skeleton";
import { useAskIntent } from "@/features/coach/hooks/use-ask-intent";

/**
 * Экран коуча: разбор дня, и только он. Диалог — за кнопкой.
 *
 * ПОРЯДОК ЗДЕСЬ И ЕСТЬ АРГУМЕНТ. Экран открывается выводом дня, постоянными
 * сигналами и отчётом «вчера против сегодня» — то есть говорит что-то полезное
 * раньше, чем человек что-либо напечатал.
 *
 * ЧТО ИЗМЕНИЛОСЬ. Переписка и поле ввода стояли внизу этого же экрана. Поле
 * ввода — это вопрос «что ты хочешь спросить?», заданный тому, кто пришёл узнать,
 * что ему делать; причём заданный после того, как разбор выше уже ответил. Теперь
 * диалог открывается кнопкой и получает почти весь экран (см. CoachChatSheet), а
 * этот экран целиком остался тем, чем и был, — выводом.
 *
 * Ссылка `/coach?ask=1` продолжает работать и открывает лист сразу: она приходит
 * с главной и из бота, и ломать её нельзя.
 */
export function CoachView() {
  // Arrived via the Dashboard's ask button (`/coach?ask=1`). Reused from the
  // record sheet's mechanism — same query, same one-shot read, same URL cleanup.
  const askIntent = useAskIntent();
  const [chatOpen, setChatOpen] = useState(false);
  /** Гасит интент из адреса, чтобы закрытый лист не открывался снова. */
  const [intentDismissed, setIntentDismissed] = useState(false);
  const {
    overview,
    isDisabled,
    isPending,
    isError,
    retry,
    isWritingBrief,
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
          <h1 className="text-page text-foreground">Коуч Nova</h1>
          <p className="text-caption text-muted-foreground">
            {overview.greeting} · {formatDay(overview.today, overview.today)}
          </p>
        </RevealItem>

        <RevealItem>
          <CoachBriefCard
            analysis={overview.analysis}
            brief={overview.brief}
            isWriting={isWritingBrief}
          />
        </RevealItem>

        <RevealItem>
          <CoachSignalsCard signals={overview.signals} />
        </RevealItem>

        <RevealItem>
          <CoachReportCard report={overview.report} />
        </RevealItem>
      </Reveal>

      {/* Кнопка вне stagger'а: она должна быть нажимаема на первом кадре, а не
          проявляться следом за тремя карточками над ней. Прилипшая к низу,
          потому что это единственное действие экрана, и искать его прокруткой
          после длинного отчёта человек не должен. */}
      <div className="sticky bottom-[calc(var(--bottom-nav-height)+var(--app-safe-bottom))] -mx-4 border-t border-border glass-panel px-4 pb-3 pt-3">
        <Button
          size="lg"
          className="w-full font-semibold"
          onClick={() => {
            haptics.tap();
            setChatOpen(true);
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Поговорить с коучем
        </Button>
      </div>

      <CoachChatSheet
        open={chatOpen || (askIntent !== null && !intentDismissed)}
        onOpenChange={(next) => {
          setChatOpen(next);
          if (!next) setIntentDismissed(true);
        }}
        history={overview.history}
        today={overview.today}
        pendingQuestion={pendingQuestion}
        isAnswering={isAnswering}
        askFailed={askFailed}
        canLoadEarlier={canLoadEarlier}
        isLoadingEarlier={isLoadingEarlier}
        onLoadEarlier={loadEarlier}
        onAsk={ask}
      />
    </PageContainer>
  );
}
