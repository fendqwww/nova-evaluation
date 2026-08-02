/**
 * The privacy policy and the terms, as the app currently behaves.
 *
 * IMPORTANT — this is engineering copy, not a lawyer's document. Every clause
 * below is a plain description of something the code actually does today
 * (photos stored inline in the user's own row, questions forwarded to
 * Anthropic, no third-party analytics), written so a user can find out what
 * happens to their data before there is a legal team to write it properly. It
 * must be reviewed before the app is offered publicly, and the screen says so
 * rather than passing a draft off as a binding agreement.
 *
 * Kept as structured sections rather than a wall of markdown so the renderer
 * stays a plain list and there is no parser between the text and the screen.
 */
export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocument {
  id: "privacy" | "terms";
  title: string;
  /** ISO day the wording last changed — shown under the heading. */
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  id: "privacy",
  title: "Политика конфиденциальности",
  updated: "2026-08-02",
  intro:
    "Nova хранит только то, что вы сами внесли в приложение, и использует это только чтобы показывать вам ваши же данные.",
  sections: [
    {
      title: "Какие данные мы храним",
      paragraphs: [
        "Профиль: имя, возраст, рост, вес, цель, род занятий, часовой пояс — то, что вы указали при знакомстве.",
        "Данные разделов: цели, привычки, задачи, тренировки, приёмы пищи, процедуры ухода и фото прогресса.",
        "Идентификатор Telegram, имя и фото профиля — они приходят от Telegram при входе и нужны, чтобы узнать вас при следующем запуске.",
        "Переписку с AI Coach: ваши вопросы и ответы коуча.",
      ],
    },
    {
      title: "Где это хранится",
      paragraphs: [
        "В базе данных приложения, привязанной к вашему аккаунту Telegram.",
        "Фото прогресса хранятся внутри вашей же записи и не выкладываются в облачные хранилища и CDN. Их читают только экраны раздела «Внешность» и только для вас.",
      ],
    },
    {
      title: "Что уходит наружу",
      paragraphs: [
        "Когда вы задаёте вопрос AI Coach, текст вопроса и краткая сводка ваших показателей за последние дни отправляются в Anthropic (Claude API), чтобы сформировать ответ. Фото туда не отправляются.",
        "Если AI Coach выключен в настройках, наружу не уходит ничего.",
        "Мы не используем рекламные сети, сторонние трекеры и системы аналитики.",
        "Мы не продаём и не передаём ваши данные третьим лицам.",
      ],
    },
    {
      title: "Ваш контроль",
      paragraphs: [
        "Экспорт: в разделе «Данные» можно выгрузить всё, что хранит приложение, одним JSON-файлом.",
        "Удаление: там же можно очистить историю любого раздела по отдельности. Удаление необратимо.",
        "Выключение AI: переключатель в разделе «AI» останавливает любую отправку данных в Claude API.",
      ],
    },
    {
      title: "Изменения",
      paragraphs: [
        "Если состав хранимых данных изменится, изменится и этот текст, а дата обновления вверху покажет, когда это произошло.",
      ],
    },
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  id: "terms",
  title: "Пользовательское соглашение",
  updated: "2026-08-02",
  intro:
    "Nova — инструмент для ведения собственных целей, привычек и здоровья. Пользуясь приложением, вы соглашаетесь с тем, как оно работает.",
  sections: [
    {
      title: "Что делает приложение",
      paragraphs: [
        "Nova записывает то, что вы вносите, считает по этим записям показатели и показывает их вам. Все цифры в приложении выведены из ваших данных и меняются вместе с ними.",
      ],
    },
    {
      title: "Это не медицинский сервис",
      paragraphs: [
        "Nova не ставит диагнозов, не назначает лечение и не заменяет врача, тренера или диетолога.",
        "Рекомендации AI Coach, расчёты калорий, нагрузок и рекомендации по уходу носят справочный характер. Решения о здоровье принимайте вместе со специалистом.",
        "Если у вас есть заболевания, ограничения или вы принимаете лекарства — сверяйтесь с врачом до того, как менять питание или нагрузки.",
      ],
    },
    {
      title: "Ваш аккаунт",
      paragraphs: [
        "Вход выполняется через Telegram. Доступ к приложению есть у того, у кого есть доступ к вашему Telegram-аккаунту.",
        "Вы отвечаете за достоверность того, что вносите: приложение считает по вашим числам и не проверяет их.",
      ],
    },
    {
      title: "AI Coach",
      paragraphs: [
        "Ответы формирует языковая модель и они могут быть неточными. Коуч опирается на ваши записи за последние дни, а не на полную историю.",
        "Использование AI можно выключить в настройках в любой момент.",
      ],
    },
    {
      title: "Подписка",
      paragraphs: [
        "Платные тарифы NOVA PLUS и NOVA MAX находятся в разработке. Оплата пока не подключена, деньги не списываются, и до запуска все функции доступны в рамках тарифа NOVA FREE.",
      ],
    },
    {
      title: "Ограничение ответственности",
      paragraphs: [
        "Приложение предоставляется «как есть». Мы стараемся сохранять ваши данные, но рекомендуем время от времени делать экспорт в разделе «Данные».",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [PRIVACY_POLICY, TERMS_OF_USE];
