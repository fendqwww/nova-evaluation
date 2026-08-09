import { formatAllowance } from "@/features/usage/lib/format";
import type { PlanId } from "@/features/settings/types";

/**
 * The three NOVA tiers, as the subscription screen and the landing both render
 * them.
 *
 * Presentation only — no gate reads this file; enforcement lives in
 * features/usage. But the AI lines are *generated* from the very ceilings that
 * gate enforces (formatAllowance), rather than typed out beside them. That is
 * the difference between copy that has to be kept in sync and copy that cannot
 * drift: the previous version of this file promised "20 запросов в день" while
 * the landing promised "10 запросов в месяц" and the server enforced neither
 * number for the feature the user was actually looking at.
 *
 * When a payment provider lands, this file stays the copy: the grant stays in
 * server/subscription.repository.ts and the checkout becomes a new caller of
 * it.
 */
export interface PlanFeature {
  text: string;
  /** Present in this tier, or greyed out as something the tier above adds. */
  included: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /**
   * Who this tier is for, in one sentence addressed to a person.
   *
   * The cards listed what each tier contains and never said who should buy it,
   * which left the reader to work out from three allowance numbers whether they
   * were a PLUS or a MAX. A tier that cannot say who it is for is a price list,
   * not an offer.
   */
  audience: string;
  /** Roubles per month. 0 for FREE. */
  price: number;
  /** The dot next to the name — matches the tint tokens in globals.css. */
  tone: "positive" | "blue" | "purple";
  features: PlanFeature[];
  /** Inherited-from line: "Всё из PLUS, плюс:". Null for the base tier. */
  inherits: PlanId | null;
  /**
   * The one tier given extra visual weight. True on exactly one entry — a
   * "recommended" badge on two cards recommends nothing.
   */
  isFeatured?: boolean;
}

/**
 * The three AI lines every tier carries, written from its own ceilings.
 *
 * Same three lines in the same order on all three cards, because the tiers
 * differ in exactly these numbers and a reader comparing them should be able to
 * compare rows rather than hunt through three differently-worded lists.
 */
export function planAiFeatureLines(plan: PlanId): string[] {
  return [
    `AI Coach — ${formatAllowance(plan, "coach")}`,
    `Анализ еды по фото — ${formatAllowance(plan, "food")}`,
    `Анализ внешности — ${formatAllowance(plan, "appearance")}`,
  ];
}

function aiFeatures(plan: PlanId): PlanFeature[] {
  return planAiFeatureLines(plan).map((text) => ({ text, included: true }));
}

export const PLAN_LIST: Plan[] = [
  {
    id: "free",
    name: "NOVA FREE",
    tagline: "Вся основа Nova",
    audience: "Чтобы начать вести здоровье и понять, нужен ли AI глубже.",
    price: 0,
    tone: "positive",
    inherits: null,
    features: [
      { text: "Цели, привычки, задачи", included: true },
      { text: "Тренировки, питание, сон, внешность", included: true },
      { text: "Life Score и аналитика дня", included: true },
      ...aiFeatures("free"),
    ],
  },
  {
    id: "plus",
    name: "NOVA PLUS",
    tagline: "AI, который видит",
    audience: "Если разбираешь еду по фото и каждый день спрашиваешь коуча.",
    price: 299,
    tone: "blue",
    inherits: "free",
    // Не список новых функций: всё это есть и во FREE, просто в узких рамках.
    // PLUS расширяет лимиты — это то, что тариф реально меняет, и обещать
    // здесь что-то ещё значит продавать несуществующее.
    features: [
      ...aiFeatures("plus"),
      { text: "Ежедневный AI-разбор дня", included: true },
      { text: "Приоритетная поддержка", included: true },
    ],
  },
  {
    id: "max",
    name: "NOVA MAX",
    tagline: "Всё, что Nova умеет и будет уметь",
    audience: "Если Nova ведёт тебя всерьёз и лимиты не должны мешать.",
    price: 599,
    tone: "purple",
    inherits: "plus",
    isFeatured: true,
    features: [
      ...aiFeatures("max"),
      { text: "Ранний доступ ко всем новым функциям", included: true },
      { text: "Новые Vision-модули и будущие AI-функции", included: true },
      { text: "Значок MAX", included: true },
    ],
  },
];

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "NOVA FREE",
  plus: "NOVA PLUS",
  max: "NOVA MAX",
};

/** "299 ₽ / месяц", or "Бесплатно" for the tier that is. */
export function formatPrice(price: number): string {
  return price === 0 ? "Бесплатно" : `${price} ₽ / месяц`;
}
