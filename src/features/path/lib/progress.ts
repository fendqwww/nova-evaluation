/**
 * Прогресс пути — выводится, никогда не хранится.
 *
 * То же правило, что у Goal и у всего остального в этом приложении: процент,
 * записанный в колонку, расходится с шагами при первом же снятом флажке. Здесь
 * он считается на месте показа, и это единственное место, где он считается —
 * главный экран, экран пути и профиль обязаны показывать одно число.
 *
 * ДВЕ МЕРЫ ПРОГРЕССА, И ЭТО ПРИНЦИПИАЛЬНО:
 *
 *   шаги — сколько сделано из того, что запланировано. Есть у любой цели.
 *   результат — сколько пройдено от старта до цели в килограммах. Есть только у
 *     измеримых целей, и он важнее: человек, закрывший все шаги и не сдвинувший
 *     вес, не достиг цели, и продукт не имеет права говорить ему обратное.
 *
 * Поэтому `ratio` (то, что рисует полоса) берётся из результата, когда результат
 * измерим, и из шагов, когда нет.
 */

import type { PathItem, PathStepItem } from "@/features/path/types";

export interface PathStage {
  index: number;
  title: string;
  goal: string;
  steps: PathStepItem[];
  doneCount: number;
  /** 0–1 по шагам этапа. */
  ratio: number;
  isComplete: boolean;
}

export interface PathProgress {
  stages: PathStage[];
  stepsTotal: number;
  stepsDone: number;
  /** Что рисует полоса: результат у измеримых целей, шаги у остальных. 0–1. */
  ratio: number;
  /** Процент для показа — то же значение, округлённое. */
  percent: number;
  /**
   * Текущий этап: первый незакрытый. Когда закрыто всё — последний, потому что
   * «этап 4 из 4, всё сделано» читается лучше, чем отсутствие этапа.
   */
  currentStage: PathStage | null;
  /** Следующий шаг — то единственное, что человеку нужно сделать сейчас. */
  nextStep: PathStepItem | null;
  /** Измеримая часть, когда цель измерима. */
  measure: {
    start: number;
    current: number;
    target: number;
    unit: string;
    /** Сколько уже пройдено, в единицах цели. Отрицательное — движение назад. */
    passed: number;
    /** Сколько осталось до цели, в единицах. Ноль — цель достигнута. */
    remaining: number;
  } | null;
  isComplete: boolean;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Шаги, сгруппированные в этапы, в порядке этапов и позиций внутри них. */
function buildStages(steps: PathStepItem[]): PathStage[] {
  const byIndex = new Map<number, PathStepItem[]>();

  for (const step of steps) {
    const bucket = byIndex.get(step.stageIndex);
    if (bucket) bucket.push(step);
    else byIndex.set(step.stageIndex, [step]);
  }

  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, stageSteps]) => {
      const sorted = [...stageSteps].sort((a, b) => a.position - b.position);
      const doneCount = sorted.filter((step) => step.isDone).length;

      return {
        index,
        title: sorted[0]?.stageTitle ?? "",
        goal: sorted[0]?.stageGoal ?? "",
        steps: sorted,
        doneCount,
        ratio: sorted.length === 0 ? 0 : doneCount / sorted.length,
        isComplete: sorted.length > 0 && doneCount === sorted.length,
      };
    });
}

export function pathProgress(path: PathItem, currentWeightKg: number | null): PathProgress {
  const stages = buildStages(path.steps);
  const stepsTotal = path.steps.length;
  const stepsDone = path.steps.filter((step) => step.isDone).length;
  const stepsRatio = stepsTotal === 0 ? 0 : stepsDone / stepsTotal;

  const currentStage = stages.find((stage) => !stage.isComplete) ?? stages.at(-1) ?? null;
  const nextStep =
    stages.flatMap((stage) => stage.steps).find((step) => !step.isDone) ?? null;

  // Измеримая часть существует только когда есть все три числа: старт, цель и
  // текущий вес. Без текущего веса прогресс по результату посчитать нельзя, и
  // подставлять вместо него старт значило бы рисовать нулевой прогресс как факт.
  const measurable =
    path.startValue !== null &&
    path.targetValue !== null &&
    path.unit !== null &&
    currentWeightKg !== null;

  let measure: PathProgress["measure"] = null;
  let ratio = stepsRatio;

  if (measurable) {
    const start = path.startValue as number;
    const target = path.targetValue as number;
    const current = currentWeightKg as number;
    const span = Math.abs(target - start);

    // Пройдено — всегда в сторону цели, поэтому знак зависит от направления:
    // для похудения это start − current, для набора current − start. Без этого
    // набравший килограмм видел бы «−1 кг пройдено» на цели «набрать».
    const signed = target < start ? start - current : current - start;
    const passed = Math.round(signed * 10) / 10;
    const remaining = Math.max(0, Math.round(Math.abs(target - current) * 10) / 10);

    measure = {
      start,
      current,
      target,
      unit: path.unit as string,
      passed,
      remaining,
    };

    // Цель «удержать вес» (span = 0) не имеет шкалы результата — там прогресс
    // честнее считать по шагам, чем делить на ноль.
    ratio = span === 0 ? stepsRatio : clamp01(passed / span);
  }

  return {
    stages,
    stepsTotal,
    stepsDone,
    ratio,
    percent: Math.round(ratio * 100),
    currentStage,
    nextStep,
    measure,
    isComplete:
      path.completedAt !== null || (stepsTotal > 0 && stepsDone === stepsTotal),
  };
}

/** «Этап 2 из 3 · Снижение веса» — одна строка для карточек. */
export function stageCaption(progress: PathProgress): string {
  if (!progress.currentStage) return "";
  return `Этап ${progress.currentStage.index + 1} из ${progress.stages.length} · ${progress.currentStage.title}`;
}

/** «82 → 75 кг» — то, что спрашивает профиль. */
export function measureCaption(progress: PathProgress): string | null {
  if (!progress.measure) return null;
  const { start, target, unit } = progress.measure;
  const suffix = unit === "kg" ? "кг" : unit;
  return `${format(start)} → ${format(target)} ${suffix}`;
}

function format(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}
