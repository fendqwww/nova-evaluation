import { STATUS_LABELS, categoryById, TELEGRAM_MESSAGE_LIMIT } from "../constants";
import type { SupportTicketView } from "../types";

/**
 * Every string the bot sends, composed in one place.
 *
 * Copy lives here rather than inline in the handlers for the same reason the
 * landing page keeps its text in constants.ts: a wording change should never
 * require reading control flow, and the handlers stay about *when* to say
 * something rather than *what*.
 *
 * Everything is HTML parse_mode. That choice is not cosmetic — MarkdownV2
 * requires escaping eighteen characters in user-supplied text, and a support
 * bot's entire payload is user-supplied text. HTML needs three, and getting
 * them wrong fails visibly rather than silently swallowing half a message.
 */

/**
 * The three characters Telegram's HTML parser treats as markup.
 *
 * Applied to *everything* that came from a user or from the database. A
 * problem description containing "<div>" is not exotic in a bug report about a
 * web app, and unescaped it would either vanish or make Telegram reject the
 * whole message with a 400 — which, inside a webhook, means support never
 * learns the ticket exists.
 */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Cut to a length that still fits after the surrounding template.
 *
 * Truncation is marked with an ellipsis rather than being silent: support
 * seeing "…" knows to open the full ticket, where support seeing a sentence
 * end mid-word would read it as the user's own typo.
 */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** A last line of defence before sendMessage: Telegram rejects anything longer. */
export function fitTelegram(value: string): string {
  return truncate(value, TELEGRAM_MESSAGE_LIMIT);
}

/**
 * Dates as Moscow wall-clock.
 *
 * The support team is one team in one timezone, and a queue is only readable
 * if every row in it is stamped in the same clock. This is the one place in
 * the app that hardcodes a zone — everywhere else a day belongs to a specific
 * user and is resolved from their Profile.timezone. Labelled "МСК" so nobody
 * has to guess which clock they are reading.
 */
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date): string {
  return `${dateFormatter.format(date)} МСК`;
}

/** How the ticket's author is addressed. Username first, id as the fallback. */
export function formatHandle(username: string | null, telegramId: string): string {
  return username ? `@${username}` : `ID ${telegramId}`;
}

/* ---------------------------------------------------------- user side --- */

export const WELCOME_MESSAGE = [
  "👋 <b>Привет! Это служба поддержки NOVA Evaluation.</b>",
  "",
  "Опишите вашу проблему, и мы поможем.",
  "",
  "Выберите тему обращения — так мы ответим быстрее:",
].join("\n");

export function categoryPrompt(categoryId: string): string {
  const category = categoryById(categoryId);
  return [
    `${category.emoji} <b>${escapeHtml(category.label)}</b>`,
    "",
    escapeHtml(category.prompt),
    "",
    "<i>Напишите сообщение одним текстом. Отменить — /cancel</i>",
  ].join("\n");
}

export const SCREENSHOT_PROMPT = [
  "📎 <b>Прикрепите скриншот</b>",
  "",
  "Если есть скриншот или фото проблемы — отправьте их сейчас. Можно несколько.",
  "",
  "Если скриншотов нет, нажмите «Пропустить».",
].join("\n");

export function screenshotAdded(count: number, max: number): string {
  return count >= max
    ? `✅ Принято ${count} из ${max}. Больше вложений добавить нельзя — отправляю обращение.`
    : `✅ Скриншот принят (${count} из ${max}). Можно отправить ещё или нажать «Отправить».`;
}

export function ticketCreated(ticketNumber: string, categoryId: string): string {
  const category = categoryById(categoryId);
  return [
    "🎫 <b>Обращение создано</b>",
    "",
    `Номер: <code>${escapeHtml(ticketNumber)}</code>`,
    `Категория: ${category.emoji} ${escapeHtml(category.label)}`,
    "",
    "Мы уже видим ваше обращение и ответим здесь же, в этом чате.",
    "Сохраните номер — по нему проще найти вашу переписку.",
    "",
    "<i>Нужно добавить что-то ещё? Просто напишите сюда — сообщение попадёт в это же обращение.</i>",
  ].join("\n");
}

/** A reply from the team, as the user receives it. */
export function supportReply(ticketNumber: string, text: string): string {
  return [
    "💬 <b>Ответ поддержки NOVA</b>",
    `<i>Обращение ${escapeHtml(ticketNumber)}</i>`,
    "",
    escapeHtml(text),
    "",
    "<i>Если вопрос остался — просто ответьте на это сообщение.</i>",
  ].join("\n");
}

export function ticketClosedForUser(ticketNumber: string): string {
  return [
    `🔒 <b>Обращение ${escapeHtml(ticketNumber)} закрыто</b>`,
    "",
    "Спасибо, что написали. Если вопрос вернётся — отправьте /start, и мы откроем новое обращение.",
  ].join("\n");
}

export function appendedToTicket(ticketNumber: string): string {
  return `📨 Добавили ваше сообщение к обращению <code>${escapeHtml(ticketNumber)}</code>. Мы его прочитаем.`;
}

export const CANCELLED_MESSAGE =
  "Отменено. Отправьте /start, когда захотите обратиться снова.";

export const HELP_MESSAGE = [
  "<b>Что умеет этот бот</b>",
  "",
  "/start — открыть меню и создать обращение",
  "/cancel — отменить текущее обращение",
  "/help — эта справка",
  "",
  "Всё остальное — просто напишите текстом, мы прочитаем.",
].join("\n");

/* ------------------------------------------------------------- errors --- */

export const RATE_LIMITED_MESSAGE =
  "⏳ Слишком много сообщений подряд. Подождите пару минут и напишите снова — мы никуда не денемся.";

export function tooManyOpenTickets(limit: number): string {
  return [
    `⚠️ У вас уже ${limit} открытых обращений.`,
    "",
    "Дождитесь ответа по ним — новое обращение можно будет создать после того, как одно из текущих закроется.",
  ].join("\n");
}

export function messageTooShort(min: number): string {
  return `Слишком коротко — опишите проблему хотя бы в ${min} символах, чтобы мы поняли, с чем помочь.`;
}

export function messageTooLong(max: number): string {
  return `Слишком длинно (максимум ${max} символов). Сократите до сути — детали можно дослать следующим сообщением.`;
}

export const UNEXPECTED_ERROR_MESSAGE =
  "😔 Что-то пошло не так на нашей стороне. Мы уже знаем об этом — попробуйте отправить сообщение ещё раз через минуту.";

export const NEED_START_MESSAGE = [
  "Чтобы мы правильно направили обращение, выберите тему.",
  "",
  "Отправьте /start и нажмите нужную кнопку.",
].join("\n");

/* --------------------------------------------------------- admin side --- */

/**
 * The card support receives for a new ticket.
 *
 * Ordered by what a person answering it needs first: who, under what heading,
 * and what they said. The account block is last because it is context, not the
 * question — and it is absent entirely for a ticket opened from a Telegram
 * account that never signed into the app, which is itself worth seeing.
 */
export function ticketCard(ticket: SupportTicketView): string {
  const category = categoryById(ticket.category);
  const lines = [
    `🚨 <b>Новый тикет ${escapeHtml(ticket.ticketNumber)}</b>`,
    "",
    "<b>Пользователь:</b>",
    `${escapeHtml(ticket.firstName)} · ${escapeHtml(formatHandle(ticket.username, ticket.telegramId))}`,
    "",
    "<b>Категория:</b>",
    `${category.emoji} ${escapeHtml(category.label)}`,
    "",
    "<b>Сообщение:</b>",
    escapeHtml(truncate(ticket.message, 2000)),
    "",
    "<b>Дата:</b>",
    formatDate(ticket.createdAt),
  ];

  if (ticket.screenshots.length > 0) {
    lines.push("", `📎 Вложений: ${ticket.screenshots.length}`);
  }

  if (ticket.account) {
    lines.push(
      "",
      "<b>Аккаунт NOVA:</b>",
      `Тариф: ${escapeHtml(ticket.account.plan.toUpperCase())}`,
      `Онбординг: ${ticket.account.onboardingCompleted ? "завершён" : "не завершён"}`,
      `Регистрация: ${formatDate(ticket.account.registeredAt)}`,
    );
  } else {
    lines.push("", "<i>Аккаунт в приложении не найден — пишет только из Telegram.</i>");
  }

  return fitTelegram(lines.join("\n"));
}

/** A follow-up message the user sent on an existing ticket. */
export function followUpCard(ticket: SupportTicketView, text: string): string {
  return fitTelegram(
    [
      `💬 <b>Дополнение к ${escapeHtml(ticket.ticketNumber)}</b>`,
      `от ${escapeHtml(formatHandle(ticket.username, ticket.telegramId))}`,
      "",
      escapeHtml(truncate(text, 3000)),
    ].join("\n"),
  );
}

/** One line of the /tickets queue. */
export function ticketListLine(ticket: SupportTicketView): string {
  const category = categoryById(ticket.category);
  return [
    `<code>${escapeHtml(ticket.ticketNumber)}</code> · ${STATUS_LABELS[ticket.status]}`,
    `${category.emoji} ${escapeHtml(formatHandle(ticket.username, ticket.telegramId))} · ${formatDate(ticket.createdAt)}`,
    `<i>${escapeHtml(truncate(ticket.message, 120))}</i>`,
  ].join("\n");
}

export function ticketsHeader(count: number, shown: number): string {
  return count === 0
    ? "📭 <b>Открытых обращений нет.</b>"
    : `📋 <b>Открытые обращения: ${count}</b>${shown < count ? ` (показаны ${shown})` : ""}`;
}

export const ADMIN_HELP_MESSAGE = [
  "<b>Команды поддержки</b>",
  "",
  "/tickets — открытые обращения",
  "/stats — статистика",
  "/reply NOVA-000001 текст — ответить пользователю",
  "/close NOVA-000001 — закрыть обращение",
  "",
  "<b>Тарифы</b>",
  "",
  "/plan @user plus — выдать PLUS на 30 дней",
  "/plan @user max 90 — MAX на 90 дней",
  "/plan @user plus 0 — бессрочно",
  "/plan @user free — снять тариф",
  "/plan @user — посмотреть текущий тариф",
  "",
  "Вместо @user можно указать числовой Telegram ID.",
  "На тикетах об оплате есть кнопки выдачи — они делают то же самое в одно касание.",
].join("\n");

/* -------------------------------------------------------------- тарифы --- */

/** Что видит админ после выдачи. */
export function planGranted(
  target: { name: string; username: string | null; telegramId: string },
  plan: string,
  until: string | null,
  notified: boolean,
): string {
  return fitTelegram(
    [
      `✅ <b>Тариф ${escapeHtml(plan.toUpperCase())} выдан</b>`,
      "",
      `${escapeHtml(target.name)} · ${escapeHtml(formatHandle(target.username, target.telegramId))}`,
      until
        ? `Действует до ${formatDate(new Date(until))}`
        : "Действует бессрочно",
      "",
      notified
        ? "Пользователь уведомлён в этом боте."
        : "<i>Уведомить не удалось — пользователь не открывал этого бота. Тариф выдан, о нём стоит сказать вручную.</i>",
    ].join("\n"),
  );
}

/** Что видит админ после снятия тарифа. */
export function planRevoked(target: { name: string; username: string | null; telegramId: string }): string {
  return fitTelegram(
    [
      "↩️ <b>Тариф снят</b>",
      "",
      `${escapeHtml(target.name)} · ${escapeHtml(formatHandle(target.username, target.telegramId))}`,
      "Аккаунт вернулся на NOVA FREE. Данные пользователя не тронуты.",
    ].join("\n"),
  );
}

/** Текущий тариф — ответ на /plan без указания тарифа. */
export function planStatus(
  target: { name: string; username: string | null; telegramId: string },
  plan: string,
  until: Date | null,
): string {
  return fitTelegram(
    [
      "💳 <b>Тариф пользователя</b>",
      "",
      `${escapeHtml(target.name)} · ${escapeHtml(formatHandle(target.username, target.telegramId))}`,
      `Сейчас: <b>${escapeHtml(plan.toUpperCase())}</b>`,
      until ? `Действует до ${formatDate(until)}` : "Без срока окончания",
    ].join("\n"),
  );
}

/**
 * Что получает пользователь.
 *
 * Тариф назван так же, как на экране подписки, и сразу сказано, что делать
 * дальше: сообщение «вам выдан PLUS» без слов о том, где его увидеть, вынуждает
 * человека написать второй раз — уже с вопросом «а где он».
 */
export function planGrantedForUser(plan: string, until: string | null): string {
  return fitTelegram(
    [
      `🎉 <b>Тариф NOVA ${escapeHtml(plan.toUpperCase())} активирован</b>`,
      "",
      until
        ? `Действует до ${formatDate(new Date(until))}.`
        : "Действует бессрочно.",
      "",
      "Откройте приложение — новые лимиты AI уже действуют. Если оно было открыто, закройте и откройте заново.",
    ].join("\n"),
  );
}

/** Что получает пользователь при снятии тарифа. */
export function planRevokedForUser(): string {
  return fitTelegram(
    [
      "ℹ️ <b>Тариф изменён</b>",
      "",
      "Ваш аккаунт вернулся на NOVA FREE. Все данные на месте, ограничены только лимиты AI.",
      "",
      "Если это ошибка — ответьте на это сообщение, разберёмся.",
    ].join("\n"),
  );
}

export function planTargetNotFound(handle: string): string {
  return fitTelegram(
    [
      `❌ Пользователь <code>${escapeHtml(handle)}</code> не найден.`,
      "",
      "Он должен хотя бы раз открыть приложение — до этого аккаунта в базе нет.",
      "Ищется по @username, числовому Telegram ID или внутреннему id.",
    ].join("\n"),
  );
}

export const PLAN_USAGE_MESSAGE = [
  "Укажите пользователя: <code>/plan @user plus 30</code>",
  "",
  "Тариф: plus, max или free. Дней: число, 0 — бессрочно (по умолчанию 30).",
].join("\n");

export const NOT_ADMIN_MESSAGE =
  "Эта команда доступна только команде поддержки. Отправьте /start, чтобы создать обращение.";

export function replyPrompt(ticketNumber: string): string {
  return [
    `✍️ <b>Ответ на ${escapeHtml(ticketNumber)}</b>`,
    "",
    "Отправьте текст следующим сообщением — он уйдёт пользователю от имени бота.",
    "",
    "Отменить — /cancel",
  ].join("\n");
}

export function replySent(ticketNumber: string): string {
  return `✅ Ответ отправлен пользователю. Обращение ${escapeHtml(ticketNumber)} переведено в статус «Отвечен».`;
}

export function ticketNotFound(raw: string): string {
  return `Обращение <code>${escapeHtml(raw)}</code> не найдено. Проверьте номер — он выглядит как NOVA-000001.`;
}

export function statsCard(stats: {
  total: number;
  byStatus: Record<string, number>;
  last24h: number;
}): string {
  return [
    "📊 <b>Статистика поддержки</b>",
    "",
    `Всего обращений: <b>${stats.total}</b>`,
    `За последние 24 часа: <b>${stats.last24h}</b>`,
    "",
    `${STATUS_LABELS.NEW}: ${stats.byStatus.NEW ?? 0}`,
    `${STATUS_LABELS.IN_PROGRESS}: ${stats.byStatus.IN_PROGRESS ?? 0}`,
    `${STATUS_LABELS.ANSWERED}: ${stats.byStatus.ANSWERED ?? 0}`,
    `${STATUS_LABELS.CLOSED}: ${stats.byStatus.CLOSED ?? 0}`,
  ].join("\n");
}

export function ticketTaken(ticketNumber: string, by: string): string {
  return `⏳ ${escapeHtml(ticketNumber)} — в работе у ${escapeHtml(by)}.`;
}

export function ticketClosedForAdmin(ticketNumber: string): string {
  return `🔒 ${escapeHtml(ticketNumber)} закрыт.`;
}
