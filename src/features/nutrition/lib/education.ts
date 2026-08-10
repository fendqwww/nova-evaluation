/**
 * «Почему это важно» — объяснение под цифрами дня.
 *
 * ЗАЧЕМ. Раздел показывал «Белок 140 / 160 г» и оставлял человека с вопросом,
 * который он обычно не задаёт вслух: а что будет, если не добрать? Цифра без
 * последствия не меняет поведение — она просто отчёт. Разница между трекером и
 * наставником здесь ровно в одной строке текста, и эта строка должна быть про
 * этого человека, а не про белок вообще.
 *
 * ПОЧЕМУ БЕЗ МОДЕЛИ. Объяснение опирается на числа, которые уже посчитаны, и
 * потому всегда правдиво, мгновенно, бесплатно и одинаково при каждом открытии.
 * Вызов Gemini на каждое открытие дневника — это, кроме расхода лимита, ещё и
 * риск, что сегодняшний ответ будет противоречить вчерашнему при тех же данных.
 * Тон и формулировки здесь написаны один раз редактором, а конкретика приходит из
 * дневника.
 *
 * ЧТО ЗАПРЕЩЕНО. Медицинских утверждений нет: тексты объясняют механизм и
 * последствия для самочувствия, но ничего не диагностируют и не назначают. Все
 * ориентиры — те же, что в lib/targets.ts и в уроках Академии.
 */

import type { DayProgress } from "@/features/nutrition/lib/stats";

export type NutritionTopicKey = "calories" | "protein" | "water";

export interface NutritionExplanation {
  key: NutritionTopicKey;
  /** «Белок» — заголовок строки. */
  label: string;
  /** «140 из 160 г» — факт, о котором идёт речь. */
  fact: string;
  /** Почему это важно и что будет иначе. Две-три фразы. */
  why: string;
  /** Что сделать сейчас. Null, когда делать нечего — цель уже закрыта. */
  action: string | null;
  /** Тон строки: закрыто, недобор, перебор. */
  state: "ok" | "under" | "over";
}

function formatG(value: number): string {
  return String(Math.round(value));
}

function formatL(ml: number): string {
  return (ml / 1000).toFixed(1).replace(".", ",");
}

/**
 * Калории: единственная величина, где перебор и недобор — разные разговоры.
 */
function explainCalories(progress: DayProgress): NutritionExplanation {
  const { value, goal } = progress.calories;
  const over = value > goal * 1.1;
  const closed = !over && progress.calories.ratio >= 0.85;

  return {
    key: "calories",
    label: "Калории",
    fact: `${formatG(value)} из ${formatG(goal)} ккал`,
    why: over
      ? `Перебор на ${formatG(value - goal)} ккал. Один такой день ничего не решает — решает средняя за неделю, поэтому исправлять его голоданием завтра не нужно: это ведёт к перебору через день.`
      : closed
        ? "Норма закрыта. Именно средняя за неделю определяет, куда идёт вес, а не отдельный день — стабильность здесь важнее точности."
        : "Дефицит калорий — единственный механизм, из-за которого снижается вес: полезная еда не отменяет арифметику. Но слишком большой дефицит забирает мышцы вместе с жиром и заканчивается срывом.",
    action: over
      ? "Держи следующие дни в норме — неделя выровняется сама"
      : closed
        ? null
        : "Запиши то, что уже съел, — иначе судить не о чем",
    state: over ? "over" : closed ? "ok" : "under",
  };
}

/** Белок: величина, недобор которой виден на весах и в зеркале. */
function explainProtein(progress: DayProgress): NutritionExplanation {
  const { value, goal } = progress.proteinG;
  const gap = Math.max(0, goal - value);
  const closed = progress.proteinG.ratio >= 0.85;

  return {
    key: "protein",
    label: "Белок",
    fact: `${formatG(value)} из ${formatG(goal)} г`,
    why: closed
      ? "Белок закрыт — на дефиците это то, что решает, уйдёт жир или мышцы. Плюс он держит сытость дольше, поэтому вечер обычно проходит спокойнее."
      : "На дефиците калорий белок решает, что именно потеряет тело: жир или мышцы. Второе следствие — насыщение: день с недобором белка почти всегда заканчивается вечерним походом на кухню.",
    action: closed ? null : `Добери ${formatG(gap)} г — творог, курица, рыба или протеин`,
    state: closed ? "ok" : "under",
  };
}

/** Вода: то, что бьёт по энергии раньше, чем человек чувствует жажду. */
function explainWater(progress: DayProgress): NutritionExplanation {
  const { value, goal } = progress.waterMl;
  const closed = progress.waterMl.ratio >= 0.85;

  return {
    key: "water",
    label: "Вода",
    fact: `${formatL(value)} из ${formatL(goal)} л`,
    why: closed
      ? "Норма выпита. Обезвоживание бьёт по работоспособности раньше, чем появляется жажда, — поэтому вода учитывается в показателе «Энергия»."
      : "Сигналы жажды и голода мозг различает плохо: часть вечерних перекусов — это нехватка воды за день, а не голод. И падение энергии от обезвоживания наступает раньше сухости во рту.",
    action: closed ? null : "Стакан сейчас — 250 мл",
    state: closed ? "ok" : "under",
  };
}

/**
 * Три объяснения к сегодняшнему дню, в порядке важности для этого дня.
 *
 * Порядок не фиксированный: сверху то, где расхождение с целью больше. Строка о
 * воде, стоящая первой у человека с закрытой водой и незакрытым белком, — это
 * шум, ради которого он перестанет читать блок вообще.
 *
 * Пустой массив, когда цель не задана: объяснять «почему важен белок» человеку,
 * у которого нет нормы, значит советовать сверяться с числом, которого нет.
 */
export function explainDay(progress: DayProgress): NutritionExplanation[] {
  if (progress.calories.goal <= 0) return [];

  const items = [explainCalories(progress)];
  if (progress.proteinG.goal > 0) items.push(explainProtein(progress));
  if (progress.waterMl.goal > 0) items.push(explainWater(progress));

  // Сначала перебор (его уже не исправить сегодня), потом самый большой недобор,
  // закрытые цели — последними.
  const rank = (item: NutritionExplanation): number =>
    item.state === "over" ? 0 : item.state === "under" ? 1 : 2;

  return items.sort((a, b) => rank(a) - rank(b));
}
