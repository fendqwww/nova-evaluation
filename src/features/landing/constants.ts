import { TELEGRAM_SUPPORT_URL } from "@/shared/config/support";
import { TELEGRAM_APP_URL } from "@/shared/config/app-bot";
import { LEGAL_DOCUMENTS } from "@/features/legal/documents";
import { PLAN_LIST, planAiFeatureLines } from "@/features/settings/lib/plans";
import { planRequestLink } from "@/features/settings/lib/support";
import type { PlanId } from "@/features/settings/types";

/**
 * Every piece of copy and every number the landing renders.
 *
 * Content lives here rather than inline in JSX so a wording or pricing change
 * is a one-file edit that never touches layout, and so the section components
 * stay pure presentation.
 */

/**
 * Два адреса продукта, и они разные.
 *
 * TELEGRAM_APP_URL — основной бот, в котором открывается приложение. Сюда
 * ведут все кнопки «Начать бесплатно»: и в шапке, и в герое, и в тарифе FREE,
 * и в финальном блоке.
 *
 * TELEGRAM_SUPPORT_URL — бот поддержки. Сюда ведут только «Получить доступ» у
 * платных тарифов (оплата пока ручная), ссылка в футере и контакты в
 * документах.
 *
 * До разделения обе роли исполнял бот поддержки, и «Начать бесплатно»
 * открывало чат обращений. Оба имени переэкспортируются из shared/config, а не
 * объявляются здесь: лендинг — не источник правды об адресах бота.
 */
export { TELEGRAM_SUPPORT_URL, TELEGRAM_APP_URL };

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

/**
 * The pricing table is not written here. It is derived from the same
 * PLAN_LIST the in-app subscription screen renders, whose AI lines are in turn
 * generated from the ceilings features/usage actually enforces.
 *
 * This used to be its own hand-written list, and the result was a landing page
 * that advertised a tier called PREMIUM at a price of "—" with "10 запросов к
 * AI Coach в месяц", next to an app that sold NOVA PLUS at 299 ₽ with a
 * completely different allowance. Three places describing the same product is
 * two places to forget.
 *
 * What stays local is what is genuinely landing-only: the shorter tagline
 * style, the non-AI feature lines, and which card is highlighted.
 */
export interface PricingTier {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: ReadonlyArray<string>;
  featured: boolean;
  cta: string;
  /** Opens the support bot already on the payment branch for this tier. */
  href: string;
}

const LANDING_TAGLINES: Record<PlanId, string> = {
  free: "Начать и почувствовать систему",
  plus: "Для тех, кто ведёт систему каждый день",
  max: "Максимальная глубина анализа",
};

/** Non-AI lines, per tier. The AI ones come from the plan itself. */
const LANDING_EXTRAS: Record<PlanId, ReadonlyArray<string>> = {
  free: ["Сон, питание, тренировки, привычки", "Дневной Life Score", "Отчёты за неделю"],
  plus: ["Всё из FREE", "Ежедневный AI-разбор дня", "Приоритетная поддержка"],
  max: ["Всё из PLUS", "Ранний доступ к новым модулям", "Значок MAX"],
};

export const PRICING_TIERS: ReadonlyArray<PricingTier> = PLAN_LIST.map((plan) => ({
  id: plan.id,
  // "NOVA PLUS" in the app, "PLUS" here — the word NOVA is already the logo at
  // the top of this page, and repeating it three times in one table is noise.
  name: plan.name.replace(/^NOVA\s+/, ""),
  tagline: LANDING_TAGLINES[plan.id],
  price: plan.price === 0 ? "0" : String(plan.price),
  priceNote: plan.price === 0 ? "навсегда" : "₽ / месяц",
  features: [...LANDING_EXTRAS[plan.id], ...planAiFeatureLines(plan.id)],
  featured: plan.id === "plus",
  cta: plan.price === 0 ? "Начать бесплатно" : "Получить доступ",
  // FREE не требует разговора — он ведёт прямо в приложение. Платные пока
  // включают вручную, поэтому их кнопка открывает поддержку на нужной ветке.
  href: plan.price === 0 ? TELEGRAM_APP_URL : planRequestLink(plan.id),
}));

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
      "Базовый тариф бесплатный и останется бесплатным: цели, привычки, тренировки, питание, сон и Life Score — целиком. Платные тарифы расширяют только лимиты AI: PLUS — 299 ₽ в месяц, MAX — 599 ₽ в месяц.",
  },
  {
    question: "Что именно ограничено на бесплатном тарифе?",
    answer:
      "Только AI. Коуч — 20 сообщений в месяц, анализ еды по фото — один раз в неделю, анализ внешности — один бесплатный анализ. Всё остальное в приложении работает без ограничений и без счётчиков.",
  },
  {
    question: "Как получить доступ сейчас?",
    answer:
      "Автоматической оплаты пока нет: напиши боту поддержки в Telegram — тариф включат вручную. Кнопка «Получить доступ» открывает нужную ветку разговора сразу.",
  },
];

/* ------------------------------------------------------------- footer --- */

/**
 * Ссылки на документы собираются из реестра, а не перечисляются здесь.
 *
 * Правила применения рекомендательных технологий обязаны быть в открытом
 * доступе (статья 10.2-2 149-ФЗ), а форма согласия — доступна тому, кто уже его
 * дал. Оба документа появились позже футера, и список, набранный руками,
 * оставил бы их без единой ссылки на сайте: то, на что не ведёт ни одна
 * ссылка, опубликованным не считается.
 */
export const FOOTER_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  external: boolean;
}> = [
  ...LEGAL_DOCUMENTS.map((document) => ({
    label: document.shortTitle,
    href: document.path,
    external: false,
  })),
  { label: "Telegram", href: TELEGRAM_SUPPORT_URL, external: true },
];
