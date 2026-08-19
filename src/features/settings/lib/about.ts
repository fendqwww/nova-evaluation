import { TELEGRAM_SUPPORT_HANDLE, TELEGRAM_SUPPORT_URL } from "@/shared/config/support";

/**
 * The version string, the release history and where to ask for help.
 *
 * APP_VERSION is kept in sync with package.json by hand. It is not imported
 * from there on purpose: package.json would be pulled into the client bundle
 * along with the entire dependency list, which is a lot of bytes and a small
 * information leak to render four characters.
 */
export const APP_VERSION = "0.2.0";

/** What stage of the product this build is. Shown next to the version. */
export const APP_STAGE = "MVP";

/**
 * Where support goes.
 *
 * Both names are aliases of the one channel constant in
 * shared/config/support.ts — the settings row that renders them predates the
 * support bot, and keeping the local names means the component did not have to
 * change when the destination did.
 */
export const SUPPORT_HANDLE = TELEGRAM_SUPPORT_HANDLE;
export const SUPPORT_URL = TELEGRAM_SUPPORT_URL;

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
    day: "2026-08-19",
    title: "Справочник упражнений и разбор профиля",
    items: [
      "Справочник из 60 упражнений по частям тела: грудь, спина, ноги, плечи, руки, пресс, кардио — с поиском и подходами по умолчанию",
      "У каждого упражнения своя картинка или схема работающих мышц; неверные подстановки картинок убраны",
      "Профиль стал короче: разделы собраны в четыре понятные группы, подписка и тема переехали туда, где их ищут",
      "AI-коуч отвечает свободнее — не только про индекс, но и на вопросы «как» и «почему»",
      "Разбор внешности перестал давать общие советы: теперь наблюдение, причина и что с этим делать",
      "Новый экран запуска",
    ],
  },
  {
    day: "2026-08-08",
    title: "Документы и согласия",
    items: [
      "Публичная оферта, Политика конфиденциальности, Согласие на обработку данных и Правила рекомендательных технологий — в приложении и на сайте одним текстом",
      "Согласие запрашивается при первом запуске, до ввода данных о здоровье",
      "AI-функции работают только при отдельном согласии на передачу данных в Google — его можно отозвать в один тап",
      "Раздел «Документы и согласия» в настройках: что подтверждено, когда и в какой редакции",
    ],
  },
  {
    day: "2026-08-08",
    title: "Лимиты AI и поддержка",
    items: [
      "Отдельные лимиты для коуча, анализа еды и анализа внешности вместо одного общего счётчика",
      "Экран «AI Usage» в подписке: видно, что осталось по каждой функции",
      "Повторное фото еды распознаётся из кэша — без нового запроса к AI",
      "Поддержка и активация тарифов — через бота в Telegram",
    ],
  },
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
      "Диалог с коучем на основе твоих данных",
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
