import "server-only";

/**
 * Публичный адрес Mini App — для кнопок `web_app` под сообщениями бота.
 *
 * ЗАЧЕМ ОН ПОНАДОБИЛСЯ. Кнопка под сообщением была обычной ссылкой на
 * `t.me/<бот>?startapp=…`, и такая кнопка открывает Mini App только если у бота
 * в @BotFather настроено Main Mini App. Если не настроено — Telegram открывает
 * чат с ботом, то есть ровно то место, где человек и нажал кнопку: ничего
 * видимого не происходит. Кнопка `web_app` открывает приложение сама, без этой
 * зависимости, но требует прямой https-адрес.
 *
 * Порядок источников: явная переменная важнее автоматической, потому что
 * VERCEL_PROJECT_PRODUCTION_URL указывает на домен проекта, а у продукта может
 * быть собственный.
 *
 * `null` — адрес неизвестен (например, локальный запуск). Тогда бот вернётся к
 * ссылке `t.me`, которая хотя бы приведёт к боту.
 */
function resolveOrigin(): string | null {
  const explicit = process.env.APP_PUBLIC_URL?.trim();
  if (explicit) {
    const withProtocol = /^https?:\/\//.test(explicit) ? explicit : `https://${explicit}`;
    return withProtocol.replace(/\/+$/, "");
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return null;
}

export const APP_ORIGIN = resolveOrigin();

/**
 * Прямой адрес экрана приложения, либо null, если публичный адрес неизвестен.
 *
 * Telegram требует от кнопки `web_app` именно https — локальный адрес он
 * отвергнет, поэтому здесь нет запасного варианта с localhost.
 */
export function appScreenUrl(path: string): string | null {
  if (APP_ORIGIN === null) return null;
  return path === "/" ? APP_ORIGIN : `${APP_ORIGIN}${path}`;
}
