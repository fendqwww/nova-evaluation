import type { SupportCategoryId, SupportTicketStatus } from "./types";

/**
 * The seven buttons of the opening menu, in the order they are shown.
 *
 * `id` is what goes into the database and into callback payloads, so it is
 * short, ASCII and stable — the Russian label is presentation and may be
 * rewritten without a migration. The emoji lives here rather than being
 * concatenated at the call site so the menu, the admin card and the ticket
 * confirmation all print the category identically.
 */
export interface SupportCategory {
  id: SupportCategoryId;
  emoji: string;
  label: string;
  /** The line the bot says after the category is picked. */
  prompt: string;
}

export const SUPPORT_CATEGORIES: readonly SupportCategory[] = [
  {
    id: "app",
    emoji: "❓",
    label: "Проблема с приложением",
    prompt: "Опишите, что происходит: на каком экране, что вы сделали и что ожидали увидеть.",
  },
  {
    id: "coach",
    emoji: "🤖",
    label: "Ошибка AI Coach",
    prompt: "Опишите, что вы спросили у коуча и что он ответил. Если ответ был странным — процитируйте его.",
  },
  {
    id: "workouts",
    emoji: "🏋️",
    label: "Тренировки",
    prompt: "Опишите вопрос по тренировкам: программа, подходы, история или что-то ещё.",
  },
  {
    id: "reports",
    emoji: "📊",
    label: "Отчёты",
    prompt: "Опишите, что в отчётах выглядит неверно или чего не хватает.",
  },
  {
    id: "billing",
    emoji: "💳",
    label: "Оплата",
    prompt: "Опишите вопрос по тарифу или оплате. Укажите, какой тариф вам нужен.",
  },
  {
    id: "bug",
    emoji: "🐛",
    label: "Сообщить об ошибке",
    prompt: "Опишите ошибку и шаги, которые к ней приводят. Скриншот сильно ускорит разбор.",
  },
  {
    id: "human",
    emoji: "👨‍💻",
    label: "Связаться с поддержкой",
    prompt: "Напишите ваш вопрос — мы прочитаем и ответим здесь же.",
  },
];

const CATEGORY_BY_ID = new Map<string, SupportCategory>(
  SUPPORT_CATEGORIES.map((category) => [category.id, category]),
);

/**
 * A category by its stored id.
 *
 * Falls back to the "human" catch-all rather than throwing: a row written by
 * an older build with a category this one no longer knows must still be
 * readable in the admin queue. A ticket you cannot open is worse than a ticket
 * filed under the wrong heading.
 */
export function categoryById(id: string): SupportCategory {
  return CATEGORY_BY_ID.get(id) ?? SUPPORT_CATEGORIES[SUPPORT_CATEGORIES.length - 1];
}

/** How a status is printed in Russian, with the dot the cards use. */
export const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  NEW: "🆕 Новый",
  IN_PROGRESS: "⏳ В работе",
  ANSWERED: "✅ Отвечен",
  CLOSED: "🔒 Закрыт",
};

/* ------------------------------------------------------------- limits --- */

/**
 * Flood protection, tuned to be invisible to anyone actually describing a
 * problem and immediate against a script.
 *
 * The window is fixed rather than sliding: a fixed window is one row and two
 * comparisons, and the failure mode it is known for — up to 2× the rate across
 * a window boundary — is irrelevant at this scale. Precision here would cost
 * more than it buys.
 */
export const RATE_LIMIT = {
  /** Length of the counting window. */
  windowMs: 60_000,
  /** Messages allowed inside one window. */
  maxMessages: 20,
  /** How long a chat that exceeded it is ignored. */
  cooldownMs: 5 * 60_000,
} as const;

/**
 * How many unresolved tickets one account may hold at once.
 *
 * This is the limit that actually matters: the per-minute window stops a
 * flood, but nothing stops someone from opening a hundred tickets slowly.
 * ANSWERED counts as unresolved — the conversation is still live until it is
 * closed.
 */
export const MAX_OPEN_TICKETS_PER_USER = 5;

/** Screenshots accepted per ticket. Telegram albums arrive as separate updates. */
export const MAX_SCREENSHOTS = 5;

/** Telegram rejects a sendMessage body over 4096 characters. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * The longest problem description accepted.
 *
 * Comfortably under the Telegram limit so that a description plus the header
 * and footer of an admin card still fits in one message without truncation.
 */
export const MAX_MESSAGE_LENGTH = 3000;

/** Below this a "description" is not one. */
export const MIN_MESSAGE_LENGTH = 5;

/** Tickets listed by /tickets in one page. */
export const TICKETS_PAGE_SIZE = 10;
