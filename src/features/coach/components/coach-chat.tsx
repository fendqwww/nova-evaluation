"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { CoachMessage, CoachThinkingMessage } from "@/features/coach/components/coach-message";
import type { CoachMessageItem } from "@/features/coach/types";

interface DayGroup {
  day: CalendarDay;
  messages: CoachMessageItem[];
}

/**
 * Consecutive runs, not a map keyed by day.
 *
 * History arrives in chronological order, so a run is all a separator needs —
 * and grouping into a map would silently merge two runs of the same day if the
 * ordering ever changed, hiding the bug rather than showing it.
 */
function groupByDay(messages: CoachMessageItem[]): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (last && last.day === message.day) last.messages.push(message);
    else groups.push({ day: message.day, messages: [message] });
  }

  return groups;
}

export function CoachChat({
  history,
  today,
  pendingQuestion,
  isAnswering,
  askFailed,
  canLoadEarlier,
  isLoadingEarlier,
  onLoadEarlier,
}: {
  history: CoachMessageItem[];
  today: CalendarDay;
  pendingQuestion: string | null;
  isAnswering: boolean;
  askFailed: boolean;
  canLoadEarlier: boolean;
  isLoadingEarlier: boolean;
  onLoadEarlier: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const seenCount = useRef(history.length);
  const hadPending = useRef(Boolean(pendingQuestion));

  useEffect(() => {
    // Only follow the conversation once it grows past what was already on
    // screen. Scrolling on mount would jump straight past the day's analysis,
    // and loading older turns prepends — which must not yank the view down.
    // A just-sent question also needs to pull the view down: it renders
    // before `history` grows, since the reply only lands once the mutation
    // resolves.
    const pendingJustAppeared = Boolean(pendingQuestion) && !hadPending.current;
    if (history.length > seenCount.current || pendingJustAppeared) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    seenCount.current = history.length;
    hadPending.current = Boolean(pendingQuestion);
  }, [history.length, pendingQuestion]);

  const groups = groupByDay(history);

  return (
    <div className="flex flex-col gap-3">
      {canLoadEarlier && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground"
          disabled={isLoadingEarlier}
          onClick={onLoadEarlier}
        >
          {isLoadingEarlier ? "Загружаем…" : "Показать более ранние"}
        </Button>
      )}

      {history.length === 0 && !pendingQuestion && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-7 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-fill-muted text-subtle-foreground">
            <MessagesSquare className="h-4.5 w-4.5" />
          </span>
          <p className="text-body font-medium text-foreground">Диалога ещё не было</p>
          <p className="max-w-[34ch] text-caption text-muted-foreground">
            Спроси что угодно о своём дне — я отвечу по твоим целям, привычкам и задачам,
            а не общими словами.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.day} className="flex flex-col gap-3">
          <div className="flex items-center gap-3 py-0.5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-subtle-foreground">
              {group.day === today ? "Сегодня" : formatDay(group.day, today)}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {group.messages.map((message) => (
            <CoachMessage key={message.id} message={message} />
          ))}
        </div>
      ))}

      <AnimatePresence initial={false}>
        {pendingQuestion && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col gap-3"
          >
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md border border-accent-border bg-accent-soft px-3.5 py-2.5 opacity-70">
                <p className="whitespace-pre-wrap wrap-break-word text-caption text-foreground">
                  {pendingQuestion}
                </p>
              </div>
            </div>
            {isAnswering && <CoachThinkingMessage />}
          </motion.div>
        )}
      </AnimatePresence>

      {askFailed && !isAnswering && (
        <p className="text-caption text-destructive">
          Не удалось получить ответ. Проверь соединение и спроси ещё раз.
        </p>
      )}

      <div ref={endRef} />
    </div>
  );
}
