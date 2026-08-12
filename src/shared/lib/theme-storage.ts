/**
 * Кэш выбранной темы на устройстве.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. Тема жила только в базе и доезжала до DOM после того, как
 * `resolve-session` вернул профиль, — то есть после сетевого запроса. Внутри
 * Telegram WebView на мобильной сети это полторы-три секунды, в течение которых
 * приложение показывало dark + Nova Blue независимо от того, что человек выбрал.
 * Он открывал Nova, видел не свою тему, она перекрашивалась под ним, и вывод был
 * ровно один: «смена цветов не работает».
 *
 * Правильный источник истины остаётся прежним — база. Это кэш последнего
 * применённого значения, чтобы следующий холодный старт нарисовал верную тему до
 * первого кадра, а не после ответа сервера. Когда сессия приезжает,
 * SessionBoundary применяет серверное значение поверх — и если человек сменил
 * тему на другом устройстве, кэш просто перезапишется.
 *
 * ВСЁ ЗДЕСЬ ОБЯЗАНО ПЕРЕЖИВАТЬ ОТСУТСТВИЕ localStorage. В Telegram WebView на iOS
 * в режиме без cookies обращение к нему бросает SecurityError, а тема — не та
 * функция, ради которой приложение имеет право не запуститься. Поэтому каждый
 * доступ обёрнут, а провал означает «кэша нет», а не ошибку.
 */

export const THEME_COLOR_KEY = "nova.theme.color";
export const THEME_MODE_KEY = "nova.theme.mode";

function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Приватный режим или отключённое хранилище. Тема применится, просто не
    // переживёт перезапуск — это деградация, а не поломка.
  }
}

/** Запомнить акцент. Вызывается из applyThemeColor, а не из компонентов. */
export function cacheThemeColor(theme: string): void {
  if (typeof window === "undefined") return;
  writeKey(THEME_COLOR_KEY, theme);
}

/**
 * Запомнить режим — именно политику ("system"), а не то, во что она разрешилась.
 *
 * Разница важна: человек, выбравший «как на устройстве», перелетев в другой
 * часовой пояс и переключив телефон на тёмную, должен получить тёмную, а не ту,
 * что была разрешена в прошлый раз.
 */
export function cacheThemeMode(mode: string): void {
  if (typeof window === "undefined") return;
  writeKey(THEME_MODE_KEY, mode);
}

export function cachedThemeColor(): string | null {
  if (typeof window === "undefined") return null;
  return readKey(THEME_COLOR_KEY);
}

export function cachedThemeMode(): string | null {
  if (typeof window === "undefined") return null;
  return readKey(THEME_MODE_KEY);
}
