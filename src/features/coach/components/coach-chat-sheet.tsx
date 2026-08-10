"use client";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { CoachChat } from "@/features/coach/components/coach-chat";
import { CoachComposer } from "@/features/coach/components/coach-composer";
import { CoachQuickActions } from "@/features/coach/components/coach-quick-actions";
import type { CoachIntent } from "@/features/coach/lib/intents";
import type { CoachMessageItem } from "@/features/coach/types";
import type { CalendarDay } from "@/shared/lib/calendar-day";

/**
 * Диалог с коучем — листом, а не половиной экрана.
 *
 * ЗАЧЕМ ЭТО ПЕРЕЕХАЛО. Экран коуча открывался разбором дня, а под ним всегда
 * висели переписка и поле ввода. Поле ввода в интерфейсе — это вопрос «что ты
 * хочешь спросить?», заданный человеку, который пришёл узнать, что ему делать.
 * Причём заданный дважды: разбор выше уже ответил, и поле под ним предлагало
 * начать разговор заново.
 *
 * Теперь экран целиком — это вывод: что происходит, почему и что делать. Диалог
 * открывается сознательным нажатием, и тогда он получает весь экран целиком, а не
 * полосу под тремя карточками — переписка, у которой видно четыре сообщения,
 * читается хуже, чем переписка, у которой видно двадцать.
 *
 * Быстрые вопросы стоят над полем ввода внутри листа: человек, который открыл
 * диалог и не знает, с чего начать, получает четыре готовых вопроса вместо
 * мигающего курсора.
 */
export function CoachChatSheet({
  open,
  onOpenChange,
  history,
  today,
  pendingQuestion,
  isAnswering,
  askFailed,
  canLoadEarlier,
  isLoadingEarlier,
  onLoadEarlier,
  onAsk,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: CoachMessageItem[];
  today: CalendarDay;
  pendingQuestion: string | null;
  isAnswering: boolean;
  askFailed: boolean;
  canLoadEarlier: boolean;
  isLoadingEarlier: boolean;
  onLoadEarlier: () => void;
  onAsk: (question: string, intent: CoachIntent | null) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {/* Почти весь экран: переписка — единственное содержимое листа, и ей нужна
          высота. Прокручивается только сама переписка, а не лист целиком, чтобы
          поле ввода не уезжало из-под пальца. */}
      <ModalContent className="flex h-[92dvh] flex-col">
        <ModalHeader>
          <ModalTitle>Коуч Nova</ModalTitle>
          <ModalDescription>
            Спроси о чём угодно — Nova отвечает по твоим данным, а не общими словами.
          </ModalDescription>
        </ModalHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <CoachChat
            history={history}
            today={today}
            pendingQuestion={pendingQuestion}
            isAnswering={isAnswering}
            askFailed={askFailed}
            canLoadEarlier={canLoadEarlier}
            isLoadingEarlier={isLoadingEarlier}
            onLoadEarlier={onLoadEarlier}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 border-t border-border pt-3">
          <CoachQuickActions disabled={isAnswering} onSelect={onAsk} />
          <CoachComposer
            disabled={isAnswering}
            autoFocus
            onSend={(question) => onAsk(question, null)}
          />
        </div>
      </ModalContent>
    </Modal>
  );
}
