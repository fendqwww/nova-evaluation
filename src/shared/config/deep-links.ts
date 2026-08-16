/**
 * Куда боту позволено приземлять человека внутри Mini App.
 *
 * ПОЧЕМУ ЭТО ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ СПИСОК ВНУТРИ РОУТЕРА. Список нужен обеим
 * сторонам ссылки: бот кодирует путь, приложение раскодирует. Пока он жил
 * только в DeepLinkRouter, вторая сторона кодировала как умела — и закодировала
 * неправильно, см. ниже.
 *
 * Модуль намеренно без `server-only`: его импортирует и клиентский роутер, и
 * серверный обработчик команд.
 */

/** Разделы, на которые ведут кнопки сообщений. */
export const DEEP_LINK_PATHS = [
  "/",
  "/goals",
  "/habits",
  "/tasks",
  "/workouts",
  "/nutrition",
  "/sleep",
  "/appearance",
  "/coach",
  "/reports",
  "/profile",
  "/settings",
  "/settings/subscription",
  "/path",
  "/library",
  "/academy",
] as const;

export type DeepLinkPath = (typeof DEEP_LINK_PATHS)[number];

/**
 * Путь → значение параметра `startapp`.
 *
 * ЗДЕСЬ БЫЛА ПОЛОМКА, ИЗ-ЗА КОТОРОЙ КНОПКА ПОД /start НИЧЕГО НЕ ДЕЛАЛА. Бот
 * собирал ссылку как `?startapp=` + encodeURIComponent(путь), то есть
 * `?startapp=%2F` для главной и `?startapp=%2Fhabits` для привычек. Telegram
 * принимает в этом параметре только `A-Za-z0-9_-`; строка с процентами не
 * проходит проверку, ссылка перестаёт быть ссылкой на Mini App и открывает
 * просто чат с ботом — тот самый, в котором человек уже стоит. Снаружи это
 * выглядело так, будто кнопка мертва, а приложение не работает.
 *
 * Поэтому слэш заменяется на подчёркивание, а главная получает собственное имя:
 * пустой параметр Telegram отбрасывает вместе с самим `startapp`.
 */
export function encodeDeepLink(path: string): string {
  if (path === "/") return "home";
  return path.replace(/^\//, "").replace(/\//g, "_");
}

/** Обратное преобразование, с проверкой по списку разрешённых путей. */
export function decodeDeepLink(token: string): DeepLinkPath | null {
  if (token === "home") return "/";

  const candidate = `/${token.replace(/_/g, "/")}`;
  return DEEP_LINK_PATHS.find((path) => path === candidate) ?? null;
}
