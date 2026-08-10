import type { PathGoalKind } from "@/features/path/lib/goal-kinds";

/**
 * Путь так, как его видит клиент.
 *
 * Даты пересекают границу серверного экшена ISO-строками, а не объектами Date —
 * та же конвенция, что у GoalItem: клиент их только показывает, и явная строка
 * делает форму провода очевидной.
 *
 * Поля `progress`, `currentStage` и `nextStep` здесь отсутствуют намеренно: всё
 * это выводится из шагов на месте показа (см. lib/progress.ts), по тому же
 * правилу, по которому у Goal нет колонки progress. Сохранённый процент —
 * второй источник истины, который расходится с первым при первом же снятом
 * шаге.
 */
export interface PathStepItem {
  id: string;
  stageIndex: number;
  stageTitle: string;
  stageGoal: string;
  title: string;
  hint: string | null;
  /** Один из PATH_STEP_TARGETS, либо null — шаг без адреса в приложении. */
  target: string | null;
  position: number;
  isDone: boolean;
}

export interface PathItem {
  id: string;
  goalKind: PathGoalKind;
  title: string;
  summary: string;
  startValue: number | null;
  targetValue: number | null;
  unit: string | null;
  horizonDays: number;
  /** "model" | "template" — кто построил план. */
  source: string;
  startedAt: string;
  completedAt: string | null;
  steps: PathStepItem[];
}

/**
 * Ответ экрана «Мой путь» одним запросом.
 *
 * `currentWeightKg` едет вместе с путём, потому что прогресс измеримой цели —
 * это разница между стартовым весом и текущим, и запрашивать вес вторым
 * запросом означало бы, что экран умеет отрендериться с прогрессом от старого
 * веса.
 */
export interface PathSnapshot {
  path: PathItem | null;
  /** Актуальный вес из профиля, кг. Null у профиля без веса. */
  currentWeightKg: number | null;
  /** Сколько путей человек уже прошёл или отложил — для строки истории. */
  archivedCount: number;
}
