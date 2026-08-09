import "server-only";

/**
 * Транспорт к Bot API, общий для обоих ботов.
 *
 * Раньше жил внутри features/support и был намертво привязан к токену бота
 * поддержки. Основному боту нужен тот же самый код — те же шесть POST, та же
 * обработка ошибок, — но со своим токеном, и копировать файл ради одной
 * переменной значило бы завести вторую реализацию «что делать, когда Telegram
 * ответил 403».
 *
 * Написано руками, а не на telegraf/grammy, по той же причине, что и раньше:
 * фреймворки построены вокруг долгоживущего процесса, который владеет циклом
 * обновлений, а здесь цикл принадлежит Telegram — у Next.js есть только
 * обработчик запроса.
 *
 * Ни один вызов не бросает исключение. Исключение внутри вебхука превращается
 * в ответ не-2xx, а на не-2xx Telegram присылает то же обновление снова — то
 * есть неудачная отправка подтверждения заставила бы бесконечно создавать
 * тикет заново. Неудача — это залогированный `null`, а решает обработчик.
 */

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  /** Кнопка, открывающая Mini App прямо из чата. */
  web_app?: { url: string };
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface SentMessage {
  message_id: number;
  chat: { id: number };
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/** Результат вызова: что вернулось и почему не получилось. */
export interface TelegramCallResult<T> {
  result: T | null;
  /** HTTP-подобный код ошибки Telegram, если он был. */
  errorCode: number | null;
  description: string | null;
}

/**
 * Журнал, который передаёт вызывающий.
 *
 * Поля сужены до примитивов, а не `unknown`: у обоих ботов свои модули
 * журналирования с таким же ограничением, и оно там осмысленное — в логи не
 * должны попадать объекты, из которых кто-нибудь однажды выведет туда текст
 * сообщения пользователя.
 */
export interface BotLogger {
  warn: (event: string, fields?: Record<string, string | number | boolean | null | undefined>) => void;
  error: (
    event: string,
    error: unknown,
    fields?: Record<string, string | number | boolean | null | undefined>,
  ) => void;
}

/**
 * Один вызов Bot API.
 *
 * Токен уходит в URL, потому что Telegram принимает его только там — и ровно
 * поэтому ни одна ветка не логирует URL. Логируется `method`: он называет
 * вызов, не унося с собой учётные данные.
 */
export async function callBotApi<T>(
  token: string,
  method: string,
  payload: Record<string, unknown>,
  log: BotLogger,
): Promise<TelegramCallResult<T>> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // У вебхука ограниченный бюджет времени, после которого Telegram
      // повторяет обновление. Исходящий вызов, зависший дольше, оставил бы
      // обработчик работающим в момент прихода дубликата.
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const data = (await response.json()) as TelegramApiResponse<T>;

    if (!data.ok) {
      log.warn("telegram_call_failed", {
        method,
        code: data.error_code ?? response.status,
        description: data.description ?? null,
      });
      return {
        result: null,
        errorCode: data.error_code ?? response.status,
        description: data.description ?? null,
      };
    }

    return { result: data.result ?? null, errorCode: null, description: null };
  } catch (error) {
    log.error("telegram_call_error", error, { method });
    return { result: null, errorCode: null, description: null };
  }
}

/**
 * Заблокировал ли пользователь бота — навсегда, а не «сейчас не получилось».
 *
 * Telegram отвечает 403 и на «bot was blocked by the user», и на «user is
 * deactivated». Оба означают, что писать этому человеку больше нельзя никогда,
 * и различать их незачем: реакция одна — перестать пытаться. Всё остальное
 * (429, 500, таймаут) — временно, и отписывать за это было бы потерей
 * пользователя из-за минутной неполадки у Telegram.
 */
export function isPermanentDeliveryFailure(errorCode: number | null): boolean {
  return errorCode === 403;
}

/** Максимальная длина сообщения в Telegram. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;

/** Обрезать до лимита, не оборвав HTML-тег посередине. */
export function fitMessage(value: string): string {
  if (value.length <= TELEGRAM_MESSAGE_LIMIT) return value;
  return `${value.slice(0, TELEGRAM_MESSAGE_LIMIT - 1)}…`;
}
