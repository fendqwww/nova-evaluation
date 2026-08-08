import { SUPPORT_CATEGORIES } from "../constants";
import { callbackData } from "./callback";
import type { InlineKeyboardMarkup } from "../server/telegram-api";
import type { SupportCategoryId } from "../types";

/**
 * Показывать ли на карточке кнопки выдачи тарифа.
 *
 * Только «Оплата» — единственная категория, где разговор действительно о
 * тарифе. Одна функция на все четыре места, где рисуется карточка, чтобы
 * очередь и уведомление не начали расходиться в том, что предлагают нажать.
 */
export function offersPlanGrant(category: SupportCategoryId): boolean {
  return category === "billing";
}

/**
 * The inline keyboards, built from the same constants the text is built from.
 *
 * Inline rather than a ReplyKeyboard throughout. A reply keyboard replaces the
 * user's own keyboard, which is exactly wrong for a bot whose main job is
 * getting someone to type a paragraph — they would have to dismiss it to
 * write. Inline buttons sit on the message and leave the input alone.
 */

/** The opening menu: seven categories, one per row. */
export function categoryKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: SUPPORT_CATEGORIES.map((category) => [
      {
        text: `${category.emoji} ${category.label}`,
        callback_data: callbackData.category(category.id),
      },
    ]),
  };
}

/**
 * Shown while collecting screenshots.
 *
 * "Отправить" appears only once something has been attached — before that it
 * would be a second, identical way to press "Пропустить", and two buttons that
 * do the same thing is how a user learns the interface is lying to them.
 */
export function screenshotKeyboard(hasScreenshots: boolean): InlineKeyboardMarkup {
  const rows = hasScreenshots
    ? [[{ text: "📨 Отправить обращение", callback_data: callbackData.submit() }]]
    : [[{ text: "⏭ Пропустить", callback_data: callbackData.skipScreenshots() }]];

  return {
    inline_keyboard: [...rows, [{ text: "✕ Отменить", callback_data: callbackData.cancel() }]],
  };
}

/**
 * Ряд выдачи тарифа — то, ради чего человек и написал в «Оплату».
 *
 * Показывается только на тикетах категории billing. На карточке про сломанную
 * кнопку «Выдать PLUS» — это способ однажды выдать тариф не тому: два тапа
 * подряд по соседним кнопкам делаются быстрее, чем читается заголовок.
 *
 * Тридцать дней зашиты в кнопку, потому что это цена одного месяца из
 * PLAN_LIST и единственный срок, который продаётся. Любой другой срок — это
 * уже разговор, и для него есть команда /plan с явным числом дней.
 */
function grantRow(ticketId: number): InlineKeyboardMarkup["inline_keyboard"] {
  return [
    [
      { text: "💎 PLUS 30д", callback_data: callbackData.grant(ticketId, "plus", 30) },
      { text: "👑 MAX 30д", callback_data: callbackData.grant(ticketId, "max", 30) },
    ],
  ];
}

/**
 * The three actions on a ticket card.
 *
 * "Взять в работу" and "Ответить" share a row because they are the two things
 * done on arrival; "Закрыть" gets its own row so the destructive one is not
 * adjacent to the one pressed most often.
 */
export function ticketActionsKeyboard(
  ticketId: number,
  canGrantPlan = false,
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...(canGrantPlan ? grantRow(ticketId) : []),
      [
        { text: "⏳ Взять в работу", callback_data: callbackData.take(ticketId) },
        { text: "✍️ Ответить", callback_data: callbackData.reply(ticketId) },
      ],
      [{ text: "🔒 Закрыть", callback_data: callbackData.close(ticketId) }],
    ],
  };
}

/**
 * The same card once someone has taken it.
 *
 * "Взять в работу" is dropped rather than disabled — Telegram has no disabled
 * state, and a button that answers "уже в работе" is a button that exists to
 * say no.
 */
export function ticketActionsAfterTakeKeyboard(
  ticketId: number,
  canGrantPlan = false,
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...(canGrantPlan ? grantRow(ticketId) : []),
      [{ text: "✍️ Ответить", callback_data: callbackData.reply(ticketId) }],
      [{ text: "🔒 Закрыть", callback_data: callbackData.close(ticketId) }],
    ],
  };
}

/** A closed ticket keeps no actions: the card becomes a record. */
export function noKeyboard(): InlineKeyboardMarkup {
  return { inline_keyboard: [] };
}
