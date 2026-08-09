import "server-only";
import { db } from "@/server/db";
import { TELEGRAM_APP_URL } from "@/shared/config/app-bot";
import {
  HELP_MESSAGE,
  STOP_MESSAGE,
  UNKNOWN_COMMAND_MESSAGE,
  startMessage,
  streakMessage,
  todayMessage,
  type BotMessage,
} from "../lib/messages";
import { logError, logInfo } from "../lib/log";
import { sendBotMessage, answerBotCallback } from "./bot-api";
import { markBlocked, markUnblocked, markUnsubscribed, touchSubscriber } from "./subscriber.repository";
import { buildStateForTelegramId } from "./user-state.repository";

/**
 * Обработчик обновлений основного бота.
 *
 * Устроен проще, чем у бота поддержки, и это не упрощение задачи: у поддержки
 * есть диалоговые состояния (выбор категории → текст → скриншоты → отправка), а
 * здесь каждая команда — один вопрос и один ответ. Состояние держать негде и
 * незачем.
 *
 * Ни одна ветка не бросает исключение наружу: не-2xx заставляет Telegram
 * прислать то же обновление снова, и ошибка в ответе на /today превратилась бы
 * в бесконечный цикл.
 */

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: TelegramUser;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: TelegramUser;
    data?: string;
    message?: { chat: { id: number } };
  };
  /** Пользователь заблокировал или разблокировал бота. */
  my_chat_member?: {
    from: TelegramUser;
    new_chat_member: { status: string };
  };
}

/** Кнопка, открывающая нужный экран приложения. */
function appButton(message: BotMessage) {
  return {
    inline_keyboard: [
      [
        {
          text: message.buttonText,
          // startapp-параметром передаётся путь: Mini App читает его при
          // запуске и открывает нужный экран вместо главного. Точка входа одна,
          // а приземление разное — иначе кнопка «Отметить привычки» открывала
          // бы главный экран, и человек искал бы раздел сам.
          url: `${TELEGRAM_APP_URL}=${encodeURIComponent(message.deepLink)}`,
        },
      ],
    ],
  };
}

/** Кнопка отписки — есть в каждом возвратном сообщении. */
export const UNSUBSCRIBE_BUTTON = { text: "Больше не писать", callback_data: "bot:stop" };

export async function handleBotUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.my_chat_member) {
      await handleMembershipChange(update.my_chat_member);
      return;
    }

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return;
    }

    if (update.message?.from && update.message.text) {
      await handleMessage(update.message.from, update.message.chat.id, update.message.text);
      return;
    }
  } catch (error) {
    logError("update_failed", error);
    // Проглочено намеренно — см. комментарий к модулю.
  }
}

/**
 * Пользователь заблокировал бота или вернулся.
 *
 * Telegram сообщает об этом отдельным типом обновления, и это единственный
 * способ узнать о блокировке заранее, не потратив попытку отправки. Отметка
 * снимается сама, когда человек разблокирует: `status` возвращается в
 * "member".
 */
async function handleMembershipChange(
  event: NonNullable<TelegramUpdate["my_chat_member"]>,
): Promise<void> {
  const blocked = event.new_chat_member.status === "kicked";
  const telegramId = String(event.from.id);

  const user = await db.user.findUnique({
    where: { telegramId },
    select: { id: true },
  });
  if (!user) return;

  if (blocked) await markBlocked(user.id);
  else await markUnblocked(user.id);

  logInfo(blocked ? "bot_blocked" : "bot_unblocked", { telegramId });
}

async function handleCallback(
  query: NonNullable<TelegramUpdate["callback_query"]>,
): Promise<void> {
  if (query.data !== "bot:stop") {
    await answerBotCallback(query.id);
    return;
  }

  const chatId = query.message?.chat.id ?? query.from.id;
  await answerBotCallback(query.id, "Больше не пишу");
  await markUnsubscribed(String(query.from.id));
  await sendBotMessage(chatId, STOP_MESSAGE);
  logInfo("unsubscribed", { telegramId: String(query.from.id), via: "button" });
}

async function handleMessage(
  from: TelegramUser,
  chatId: number,
  text: string,
): Promise<void> {
  const telegramId = String(from.id);
  const name = from.first_name ?? "друг";

  if (!text.startsWith("/")) {
    // Бот не ведёт переписку: для разговора есть поддержка, а для всего
    // остального — приложение. Молчать в ответ было бы грубо, отвечать
    // подобием чата — обманом.
    await sendBotMessage(chatId, HELP_MESSAGE);
    return;
  }

  const command = text.slice(1).split(/[\s@]/)[0].toLowerCase();

  switch (command) {
    case "start": {
      const { isReturning } = await touchSubscriber(telegramId, String(chatId));
      const message = startMessage(name, isReturning);
      await sendBotMessage(chatId, message.text, appButton(message));
      logInfo("start", { telegramId, returning: isReturning });
      return;
    }

    case "today": {
      const state = await buildStateForTelegramId(telegramId);
      if (!state) {
        await sendBotMessage(chatId, NOT_REGISTERED_MESSAGE);
        return;
      }
      const message = todayMessage(state);
      await sendBotMessage(chatId, message.text, appButton(message));
      return;
    }

    case "streak": {
      const state = await buildStateForTelegramId(telegramId);
      if (!state) {
        await sendBotMessage(chatId, NOT_REGISTERED_MESSAGE);
        return;
      }
      const message = streakMessage(state);
      await sendBotMessage(chatId, message.text, appButton(message));
      return;
    }

    case "stop":
      await markUnsubscribed(telegramId);
      await sendBotMessage(chatId, STOP_MESSAGE);
      logInfo("unsubscribed", { telegramId, via: "command" });
      return;

    case "help":
      await sendBotMessage(chatId, HELP_MESSAGE);
      return;

    default:
      await sendBotMessage(chatId, UNKNOWN_COMMAND_MESSAGE);
      return;
  }
}

/**
 * Ответ человеку, который нажал /today, ни разу не открыв приложение.
 *
 * Отдельный текст, а не «ошибка»: у него действительно нет данных, и
 * единственное осмысленное действие — открыть приложение.
 */
const NOT_REGISTERED_MESSAGE = [
  "Пока нечего показать — вы ещё не заходили в приложение.",
  "",
  "Откройте Nova кнопкой меню слева от поля ввода, и через пару дней здесь появятся сводки.",
].join("\n");
