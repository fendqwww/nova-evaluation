/**
 * The version string, the release history and where to ask for help.
 *
 * APP_VERSION is kept in sync with package.json by hand. It is not imported
 * from there on purpose: package.json would be pulled into the client bundle
 * along with the entire dependency list, which is a lot of bytes and a small
 * information leak to render four characters.
 */
export const APP_VERSION = "0.1.0";

/** What stage of the product this build is. Shown next to the version. */
export const APP_STAGE = "MVP";

/**
 * Where support goes.
 *
 * PLACEHOLDER — replace with the real support account before release. Kept as
 * a constant rather than inlined in the component so there is exactly one place
 * to change when it exists.
 */
export const SUPPORT_HANDLE = "@nova_support";
export const SUPPORT_URL = "https://t.me/nova_support";

/**
 * The changelog, newest first.
 *
 * Entries are the sections as they actually shipped, in build order — this is
 * a record of what the user gained, not a git log, so a refactor that changed
 * nothing on screen does not get a line here.
 *
 * Deliberately without per-entry version numbers: the app has shipped one
 * version so far (see APP_VERSION) and inventing a version history to decorate
 * the list would be the kind of detail that is wrong the moment anyone checks.
 */
export interface ChangelogEntry {
  /** ISO day, the same CalendarDay convention the rest of the app uses. */
  day: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    day: "2026-08-02",
    title: "Настройки",
    items: [
      "Раздел настроек: аккаунт, внешний вид, регион, уведомления, AI, данные",
      "Светлая, тёмная и системная тема",
      "Экспорт всех данных одним файлом и очистка истории по разделам",
      "Общий архив: привычки, тренировки, продукты и процедуры в одном списке",
      "Экран подписки NOVA FREE / PLUS / MAX",
    ],
  },
  {
    day: "2026-08-01",
    title: "Внешность",
    items: [
      "Процедуры ухода с расписанием и чек-листами",
      "Фото прогресса и сравнение «до / после»",
      "Цели по внешности и история изменений",
    ],
  },
  {
    day: "2026-07-31",
    title: "Тренировки и питание",
    items: [
      "Программы тренировок, сессии и учёт подходов",
      "Дневник питания, КБЖУ, вода и шаблоны приёмов пищи",
      "Собственный каталог продуктов",
    ],
  },
  {
    day: "2026-07-30",
    title: "AI Coach",
    items: [
      "Ежедневный разбор дня и сигналы по разделам",
      "Диалог с коучем на основе ваших данных",
      "Цели с шагами, привычки с расписанием, приоритеты задач",
    ],
  },
  {
    day: "2026-07-23",
    title: "Первый запуск",
    items: [
      "Знакомство и профиль",
      "Dashboard и Life Score",
      "Цели, привычки и задачи",
    ],
  },
];
