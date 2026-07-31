import { pluralizeRu } from "@/shared/lib/pluralize-ru";

/**
 * Numbers as a Russian gym reads them.
 *
 * Weight is the awkward one: plates come in halves, so 62.5 has to survive, but
 * "62.5" with a decimal point is not how it is written here and "62,50" is not
 * how it is said. One decimal, only when there is one, always with a comma.
 */
const decimal = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export function formatWeight(weightKg: number): string {
  return decimal.format(Math.round(weightKg * 10) / 10);
}

/** "62,5 кг", or "своим весом" when the bar is not the point. */
export function formatLoad(weightKg: number | null): string {
  if (weightKg === null) return "свой вес";
  if (weightKg === 0) return "без веса";
  return `${formatWeight(weightKg)} кг`;
}

/**
 * Tonnage. Past a tonne the kilogram stops being a readable unit — 18 640 кг is
 * a number you have to count the digits of, 18,6 т is a number you can feel.
 */
export function formatVolume(volumeKg: number): string {
  if (volumeKg <= 0) return "0 кг";
  if (volumeKg >= 1000) return `${decimal.format(Math.round(volumeKg / 100) / 10)} т`;
  return `${whole.format(Math.round(volumeKg))} кг`;
}

/** "3 × 10" — the way a plan is written on paper. */
export function formatTarget(sets: number, reps: number): string {
  return `${sets} × ${reps}`;
}

/** "90 сек" / "1:30" — rest is read as a clock past a minute. */
export function formatRest(seconds: number): string {
  if (seconds <= 0) return "без отдыха";
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} мин` : `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** mm:ss, for a running rest timer. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function sessionsWord(count: number): string {
  return pluralizeRu(count, ["тренировка", "тренировки", "тренировок"]);
}

/** As the object of a verb: "закрыл 1 тренировку", "закрыл 2 тренировки". */
export function sessionsAccusative(count: number): string {
  return pluralizeRu(count, ["тренировку", "тренировки", "тренировок"]);
}

export function setsWord(count: number): string {
  return pluralizeRu(count, ["подход", "подхода", "подходов"]);
}

export function repsWord(count: number): string {
  return pluralizeRu(count, ["повторение", "повторения", "повторений"]);
}

export function exercisesWord(count: number): string {
  return pluralizeRu(count, ["упражнение", "упражнения", "упражнений"]);
}
