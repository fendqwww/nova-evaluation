/**
 * Every piece of copy and every number the landing renders.
 *
 * Content lives here rather than inline in JSX so a wording or pricing change
 * is a one-file edit that never touches layout, and so the section components
 * stay pure presentation.
 */

/**
 * Support / access contact.
 *
 * PLACEHOLDER — swap for the real channel before launch. Every "получить
 * доступ" call to action on the page resolves to this one constant.
 */
export const TELEGRAM_SUPPORT_URL = "https://t.me/nova_support";

export const NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Возможности", href: "#how" },
  { label: "AI Coach", href: "#coach" },
  { label: "Отчёты", href: "#reports" },
  { label: "Тарифы", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/* ------------------------------------------------------------ pillars --- */

export type PillarId = "sleep" | "nutrition" | "training" | "habits";

export interface Pillar {
  id: PillarId;
  title: string;
  russianTitle: string;
  description: string;
  /** Feeds both the icon tint and the card's hover glow. */
  color: string;
  metrics: ReadonlyArray<string>;
}

/*
 * Pillar hues.
 *
 * Stepped to the dark-surface band (OKLCH L 0.48–0.67 on #050505) and validated
 * as a set: chroma floor, adjacent-pair CVD separation, normal-vision
 * separation and 3:1 contrast all pass.
 *
 * One caveat drives a layout rule elsewhere: NOVA violet and the blue are the
 * two ends of the brand gradient, so as *categorical* colors they are nearly
 * identical to a deuteranope (ΔE 1.3). That is fine for a gradient, which
 * encodes nothing, but it means the four pillars must never be told apart by
 * colour alone — every place they appear together carries an icon and a text
 * label, and the reports section plots them as separate labelled rows rather
 * than as four series sharing one legend.
 */

export const PILLARS: ReadonlyArray<Pillar> = [
  {
    id: "sleep",
    title: "Sleep",
    russianTitle: "Сон",
    description:
      "Длительность, регулярность и качество восстановления. NOVA видит, как вчерашняя ночь влияет на сегодняшнюю энергию.",
    color: "#8b5cf6",
    metrics: ["Часы сна", "Регулярность", "Восстановление"],
  },
  {
    id: "nutrition",
    title: "Nutrition",
    russianTitle: "Питание",
    description:
      "КБЖУ, вода и режим приёмов пищи. Логируй фотографией — остальное NOVA посчитает сама.",
    color: "#0d9488",
    metrics: ["Калории", "Белки · Жиры · Углеводы", "Вода"],
  },
  {
    id: "training",
    title: "Training",
    russianTitle: "Тренировки",
    description:
      "Объём, интенсивность и прогресс по неделям. Нагрузка сверяется с восстановлением, а не живёт отдельно от него.",
    color: "#3b82f6",
    metrics: ["Объём", "Интенсивность", "Прогресс"],
  },
  {
    id: "habits",
    title: "Habits",
    russianTitle: "Привычки",
    description:
      "Серии, срывы и реальный процент выполнения. То, что повторяется каждый день, и создаёт результат.",
    color: "#c98500",
    metrics: ["Серии", "Регулярность", "Выполнение"],
  },
];

/* -------------------------------------------------------------- coach --- */

export interface CoachCapability {
  title: string;
  description: string;
}

export const COACH_CAPABILITIES: ReadonlyArray<CoachCapability> = [
  {
    title: "Анализ состояния",
    description:
      "NOVA читает твои данные за неделю целиком — сон, нагрузку, питание и привычки в одной картине.",
  },
  {
    title: "Причины",
    description:
      "Не просто «ты устал», а почему: три коротких ночи подряд на фоне выросшего объёма тренировок.",
  },
  {
    title: "Рекомендации",
    description:
      "Конкретное следующее действие на сегодня, а не список общих советов из интернета.",
  },
  {
    title: "Память",
    description:
      "Коуч помнит твои цели, ограничения и прошлые разговоры. Не нужно объяснять контекст заново.",
  },
];

/* ------------------------------------------------------------ pricing --- */

export interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: ReadonlyArray<string>;
  featured: boolean;
  cta: string;
}

export const PRICING_TIERS: ReadonlyArray<PricingTier> = [
  {
    id: "free",
    name: "FREE",
    tagline: "Начать и почувствовать систему",
    price: "0",
    priceNote: "навсегда",
    features: [
      "Сон, питание, тренировки, привычки",
      "Дневной Life Score",
      "Базовые отчёты за неделю",
      "10 запросов к AI Coach в месяц",
    ],
    featured: false,
    cta: "Начать бесплатно",
  },
  {
    id: "premium",
    name: "PREMIUM",
    tagline: "Для тех, кто ведёт систему каждый день",
    price: "—",
    priceNote: "цена скоро",
    features: [
      "Всё из FREE",
      "Безлимитный AI Coach с памятью",
      "AI Vision: анализ еды по фото",
      "Глубокие отчёты и тренды",
      "Персональные цели и планы",
    ],
    featured: true,
    cta: "Получить доступ",
  },
  {
    id: "max",
    name: "MAX",
    tagline: "Максимальная глубина анализа",
    price: "—",
    priceNote: "цена скоро",
    features: [
      "Всё из PREMIUM",
      "AI Vision: отслеживание внешности",
      "Приоритетная модель анализа",
      "Расширенная история и экспорт",
      "Ранний доступ к новым модулям",
    ],
    featured: false,
    cta: "Получить доступ",
  },
];

/* ---------------------------------------------------------------- faq --- */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: ReadonlyArray<FaqItem> = [
  {
    question: "Что такое NOVA?",
    answer:
      "Персональная система развития. NOVA собирает четыре области — сон, питание, тренировки и привычки — в одну картину и превращает её в конкретные ежедневные действия с помощью AI.",
  },
  {
    question: "Чем это отличается от обычного трекера?",
    answer:
      "Трекер показывает цифры и оставляет тебя с ними один на один. NOVA объясняет, что эти цифры значат вместе, находит причины и говорит, что делать дальше. Данные — это средство, а не результат.",
  },
  {
    question: "Нужны ли умные часы или браслет?",
    answer:
      "Нет. NOVA работает с тем, что ты вносишь сам, а AI Vision позволяет логировать еду одной фотографией. Интеграции с носимыми устройствами — в планах.",
  },
  {
    question: "Как работает AI Vision?",
    answer:
      "Ты фотографируешь блюдо — NOVA распознаёт состав и оценивает КБЖУ. Для внешности: серия фотографий во времени превращается в объективную линию изменений вместо ощущений в зеркале.",
  },
  {
    question: "Где хранятся мои данные?",
    answer:
      "В защищённой базе, привязанной к твоему аккаунту. Данные используются только для того, чтобы NOVA могла давать тебе персональные рекомендации, и не продаются третьим лицам.",
  },
  {
    question: "Сколько это стоит?",
    answer:
      "Базовый тариф бесплатный и останется бесплатным. Оплата PREMIUM и MAX пока не подключена — доступ выдаётся вручную через поддержку в Telegram.",
  },
  {
    question: "Как получить доступ сейчас?",
    answer:
      "Напиши в поддержку в Telegram — доступ откроют вручную. Оплата на этом этапе не требуется.",
  },
];

/* ------------------------------------------------------------- footer --- */

export const FOOTER_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  external: boolean;
}> = [
  { label: "Политика конфиденциальности", href: "/legal/privacy", external: false },
  { label: "Публичная оферта", href: "/legal/offer", external: false },
  { label: "Telegram", href: TELEGRAM_SUPPORT_URL, external: true },
];
