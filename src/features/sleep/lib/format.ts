import { pluralizeRu } from "@/shared/lib/pluralize-ru";

export const QUALITY_LABELS = ["", "Плохо", "Так себе", "Нормально", "Хорошо", "Отлично"] as const;

/** "" for 0 (no data) — callers only show this once quality > 0. */
export function qualityLabel(quality: number): string {
  return QUALITY_LABELS[quality] ?? "";
}

export function nightsWord(count: number): string {
  return pluralizeRu(count, ["ночь", "ночи", "ночей"]);
}
