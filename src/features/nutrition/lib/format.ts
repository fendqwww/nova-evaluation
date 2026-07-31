import { pluralizeRu } from "@/shared/lib/pluralize-ru";

export function caloriesWord(count: number): string {
  return pluralizeRu(count, ["калория", "калории", "калорий"]);
}

export function gramsWord(count: number): string {
  return pluralizeRu(count, ["грамм", "грамма", "граммов"]);
}

export function daysWord(count: number): string {
  return pluralizeRu(count, ["день", "дня", "дней"]);
}

/** "1 320 ккал" — thousands-separated, no decimals; calories are never fractional to the user. */
export function formatCalories(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ккал`;
}

/** "84 г" for a macro total. */
export function formatGrams(value: number): string {
  return `${Math.round(value)} г`;
}

/** "1,2 л" above a litre, "350 мл" below — water is read in litres once it's substantial. */
export function formatWater(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} л`;
  return `${ml} мл`;
}
