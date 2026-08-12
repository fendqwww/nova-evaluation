/**
 * Примерное меню на день, собранное под уже посчитанную норму.
 *
 * ЗАЧЕМ. Приложение считало норму (calculateTargets) и на этом останавливалось:
 * человек получал «1840 ккал, 128 г белка» и пустой дневник. Между нормой и
 * первой записью лежал вопрос, на который приложение не отвечало, — «а что мне
 * есть-то». Он и есть настоящий барьер: цифру можно принять за минуту, а меню
 * на день сочиняют полчаса, и обычно не сочиняют вовсе.
 *
 * ЧТО ЭТО НЕ ТАКОЕ. Не диета и не предписание. Это одна раскладка нормы по
 * четырём приёмам пищи, собранная из тех же готовых блюд, что лежат во вкладке
 * «Шаблоны», — то есть каждую строку меню можно записать в дневник одним
 * нажатием, а не переписывать руками. Меню детерминировано: при одних и тех же
 * норме и цели оно одно и то же, поэтому его можно обсуждать («вот моё меню»), а
 * не пересобирать заново при каждом открытии экрана. `variant` даёт другую
 * раскладку той же нормы — для тех, кому не подошла первая.
 *
 * ЧЕСТНОСТЬ ЦИФР. Итог меню почти никогда не совпадает с нормой до килокалории,
 * и подгонять его нельзя: порции ограничены разумными пределами (см. PORTION_*),
 * потому что «310 г стейка» ради попадания в цифру — это не рекомендация, а
 * арифметика. Поэтому наружу отдаются и норма, и фактический итог, и UI
 * показывает оба.
 */

import {
  QUICK_MEAL_TEMPLATES,
  type QuickMealTemplate,
} from "@/features/nutrition/lib/quick-templates";
import type { NutritionAim } from "@/features/nutrition/lib/targets";
import type { MealSlot } from "@/features/nutrition/types";

/**
 * Как норма делится между приёмами пищи.
 *
 * Три разные раскладки, а не одна: на дефиците обед и ужин должны быть плотными,
 * иначе вечер заканчивается срывом, а перекус ужимается до горсти; на наборе,
 * наоборот, перекус — полноценный приём, потому что съесть профицит за три
 * подхода тяжело физически. Доли в каждой строке дают единицу.
 */
const SLOT_SHARE: Record<NutritionAim, Record<MealSlot, number>> = {
  lose: { breakfast: 0.25, lunch: 0.35, snack: 0.1, dinner: 0.3 },
  maintain: { breakfast: 0.25, lunch: 0.35, snack: 0.12, dinner: 0.28 },
  gain: { breakfast: 0.26, lunch: 0.3, snack: 0.18, dinner: 0.26 },
};

/** Порядок, в котором приёмы пищи идут по дню. */
const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

/**
 * Насколько порцию разрешено двигать от той, что записана в шаблоне.
 *
 * Пределы существуют затем, чтобы меню оставалось едой, а не решением уравнения:
 * без них подгонка под норму выдавала бы 40 г каши на завтрак и 620 г рыбы на
 * ужин. Промах по калориям честнее невозможной порции — его видно в итоге.
 */
const PORTION_MIN_FACTOR = 0.6;
const PORTION_MAX_FACTOR = 1.8;

/** Сколько кандидатов на слот участвует в выборе варианта. */
const CANDIDATE_POOL = 4;

export interface SampleMenuItem {
  slot: MealSlot;
  /** id готового блюда — по нему строка записывается в дневник одним нажатием. */
  templateId: string;
  name: string;
  ingredients: string[];
  amountG: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface SampleMenu {
  items: SampleMenuItem[];
  /** Фактический итог меню — не норма, см. заголовок файла. */
  totals: { calories: number; proteinG: number; fatG: number; carbsG: number };
}

export interface SampleMenuTargets {
  calories: number;
  proteinG: number;
}

/**
 * Насколько блюдо подходит цели. Больше — лучше.
 *
 * Считается один раз по составу на 100 г и не зависит от порции — иначе шаблон с
 * большой порцией по умолчанию выигрывал бы у такого же блюда с маленькой,
 * притом что порцию мы всё равно пересчитываем.
 */
function suitability(template: QuickMealTemplate, aim: NutritionAim): number {
  // Белка на килокалорию — то, чем блюда вообще различимы с точки зрения цели.
  const proteinDensity = template.proteinPer100 / Math.max(1, template.caloriesPer100);

  if (aim === "lose") {
    // На дефиците выигрывает белок и проигрывает калорийная плотность: при
    // одинаковых калориях сытнее то, где больше белка и больше объём.
    return proteinDensity * 100 - template.caloriesPer100 / 400;
  }

  if (aim === "gain") {
    // На наборе нужен объём калорий, который реально съедается, — но не любой
    // ценой: блюдо без белка на массе бесполезно, поэтому он остаётся в счёте.
    return template.caloriesPer100 / 100 + proteinDensity * 40;
  }

  // На поддержании выигрывает баланс, а не крайность: и «одни орехи», и «одна
  // зелень» одинаково плохо описывают обычный день.
  return proteinDensity * 60 - Math.abs(template.caloriesPer100 - 150) / 100;
}

/** Порция под бюджет слота, ограниченная разумными пределами. */
function portionFor(template: QuickMealTemplate, budgetKcal: number): number {
  const exact = (budgetKcal / Math.max(1, template.caloriesPer100)) * 100;
  const min = template.amountG * PORTION_MIN_FACTOR;
  const max = template.amountG * PORTION_MAX_FACTOR;
  const clamped = Math.min(max, Math.max(min, exact));

  // До десятков граммов: «187 г гречки» — точность, которой не бывает у весов на
  // кухне и которой не требует ни один расчёт здесь.
  return Math.max(10, Math.round(clamped / 10) * 10);
}

function itemFrom(template: QuickMealTemplate, amountG: number): SampleMenuItem {
  const factor = amountG / 100;

  return {
    slot: template.mealSlot,
    templateId: template.id,
    name: template.name,
    ingredients: template.ingredients,
    amountG,
    calories: Math.round(template.caloriesPer100 * factor),
    proteinG: Math.round(template.proteinPer100 * factor),
    fatG: Math.round(template.fatPer100 * factor),
    carbsG: Math.round(template.carbsPer100 * factor),
  };
}

/**
 * Собрать меню под норму.
 *
 * `variant` перебирает кандидатов внутри каждого слота: 0 — самое подходящее
 * цели блюдо, 1 — следующее и так далее. Одно число на всё меню, а не своё на
 * каждый слот, потому что человеку нужна кнопка «другой вариант», а не четыре
 * независимых переключателя.
 */
export function buildSampleMenu(
  targets: SampleMenuTargets,
  aim: NutritionAim,
  variant = 0,
): SampleMenu {
  const shares = SLOT_SHARE[aim];
  const items: SampleMenuItem[] = [];

  for (const slot of SLOT_ORDER) {
    const candidates = QUICK_MEAL_TEMPLATES.filter((template) => template.mealSlot === slot)
      .sort((a, b) => suitability(b, aim) - suitability(a, aim))
      .slice(0, CANDIDATE_POOL);

    if (candidates.length === 0) continue;

    // Модуль по длине пула, а не по числу блюд в слоте: иначе «другой вариант»
    // на пятом нажатии выдавал бы блюдо, которое цели уже не соответствует.
    const chosen = candidates[((variant % candidates.length) + candidates.length) % candidates.length];
    const budget = targets.calories * shares[slot];

    items.push(itemFrom(chosen, portionFor(chosen, budget)));
  }

  const totals = items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      proteinG: sum.proteinG + item.proteinG,
      fatG: sum.fatG + item.fatG,
      carbsG: sum.carbsG + item.carbsG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

  return { items, totals };
}

/** Сколько всего вариантов меню различимо — столько раз кнопка даёт новое. */
export const SAMPLE_MENU_VARIANTS = CANDIDATE_POOL;
