import type { PlanId } from "@/features/settings/types";

/**
 * The three NOVA tiers, as the subscription screen renders them.
 *
 * Presentation only. There is no billing and no gate that reads `plan` to
 * refuse a section, and the screen says so plainly rather than implying a
 * paywall that does not exist. When payments land, this file stays the copy
 * and the enforcement goes next to the features it limits, not here.
 *
 * The one number here that *is* enforced is FREE's daily AI allowance, and it
 * is enforced in src/ai/limits.ts rather than from this file — this is the
 * copy, that is the ceiling. They have to be changed together, which is why
 * the number is spelled out in the feature line instead of hidden behind a
 * vague "с ограничениями".
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
  /** Roubles per month. 0 for FREE. */
  price: number;
  /** The dot next to the name — matches the tint tokens in globals.css. */
  tone: "positive" | "blue" | "purple";
  features: PlanFeature[];
  /** Inherited-from line: "Всё из PLUS, плюс:". Null for the base tier. */
  inherits: PlanId | null;
}

export const PLAN_LIST: Plan[] = [
  {
    id: "free",
    name: "NOVA FREE",
    tagline: "Вся основа Life OS",
    price: 0,
    tone: "positive",
    inherits: null,
    features: [
      { text: "Цели, привычки, задачи", included: true },
      { text: "Тренировки, питание, сон, внешность", included: true },
      { text: "Life Score и аналитика дня", included: true },
      { text: "AI Coach, анализ еды и внешности — 20 запросов в день", included: true },
    ],
  },
  {
    id: "plus",
    name: "NOVA PLUS",
    tagline: "AI, который видит",
    price: 299,
    tone: "blue",
    inherits: "free",
    features: [
      { text: "Безлимитный AI Coach", included: true },
      { text: "Анализ еды по фото", included: true },
      { text: "Автоматический расчёт КБЖУ", included: true },
      { text: "Анализ внешности", included: true },
      { text: "Расширенная аналитика", included: true },
    ],
  },
  {
    id: "max",
    name: "NOVA MAX",
    tagline: "Всё, что Nova умеет и будет уметь",
    price: 599,
    tone: "purple",
    inherits: "plus",
    features: [
      { text: "Ранний доступ ко всем новым функциям", included: true },
      { text: "Будущие AI-функции", included: true },
      { text: "Voice AI", included: true },
      { text: "Новые Vision-модули", included: true },
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
