/**
 * Russian has three plural forms depending on the count (1 цель, 2 цели,
 * 5 целей) — a naive "count + noun" concatenation reads as broken Russian,
 * so every count shown in the UI must go through this.
 */
export function pluralizeRu(
  count: number,
  [one, few, many]: [one: string, few: string, many: string],
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
