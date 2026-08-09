/**
 * Журнал основного бота.
 *
 * Отдельный префикс от бота поддержки: в одном потоке логов Vercel это
 * единственный способ отличить «не доставилось напоминание» от «не доставился
 * ответ на тикет».
 *
 * Ни одно поле не должно содержать текста сообщений пользователя: сюда пишутся
 * идентификаторы и коды, а не содержимое. Логи с данными о здоровье — это
 * данные о здоровье в логах.
 */

const PREFIX = "[bot]";

type LogFields = Record<string, unknown>;

function line(fields?: LogFields): string {
  if (!fields) return "";
  const pairs = Object.entries(fields).map(([key, value]) => `${key}=${String(value)}`);
  return pairs.length > 0 ? ` ${pairs.join(" ")}` : "";
}

export function logInfo(event: string, fields?: LogFields): void {
  console.info(`${PREFIX} ${event}${line(fields)}`);
}

export function logWarn(event: string, fields?: LogFields): void {
  console.warn(`${PREFIX} ${event}${line(fields)}`);
}

export function logError(event: string, error: unknown, fields?: LogFields): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${PREFIX} ${event} error=${message}${line(fields)}`);
}
