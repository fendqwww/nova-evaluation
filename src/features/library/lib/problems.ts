/**
 * Диагноз, из которого получается рекомендация книги.
 *
 * ЗАЧЕМ ЭТО СУЩЕСТВУЕТ. Обещание раздела — «объяснить, почему эта книга нужна
 * именно тебе». Выполнить его можно двумя способами: спросить модель или
 * посмотреть на данные человека. Здесь выбран второй, и это не экономия на
 * вызове Gemini, а вопрос правдивости: фраза «ты бросаешь цели через неделю»
 * должна быть проверяемым фактом, а не догадкой. Каждое правило ниже опирается на
 * число, которое приложение уже посчитало, и предъявляет это число человеку в
 * самом объяснении.
 *
 * Побочные, но важные следствия: раздел работает без ключа к API, не тратит
 * лимит тарифа, отвечает мгновенно и одинаково при каждом открытии — а не
 * предлагает вчера одну книгу, сегодня другую по одним и тем же данным.
 *
 * ПОРОГИ. Все взяты из тех же формул, что уже стоят в продукте: 120 минут
 * недосыпа за неделю — порог, с которого «Сон» на главной начинает о нём
 * говорить; 0,6 по выполнению — граница, ниже которой блок NOVA Score
 * недобирает больше трети; 90 минут разброса отхода ко сну — уровень, на котором
 * средняя длительность сна перестаёт что-либо значить.
 */

import type { LibraryProblemId } from "@/features/library/content/books";

export interface LibrarySignals {
  /** 0–1 за последнюю неделю. */
  habitAdherence: number;
  /** Сколько активных привычек вообще есть. */
  habitsActive: number;
  /** 0–1 за последнюю неделю. */
  nutritionAdherence: number;
  hasNutritionGoal: boolean;
  /** Средний белок за неделю против цели, 0–1. Null без цели. */
  proteinRatio: number | null;
  /** Минуты недосыпа за последнюю неделю. */
  sleepDebtMin: number;
  /** Разброс времени отхода ко сну за неделю, минуты. Null без записей. */
  bedTimeSpreadMin: number | null;
  hasSleepLogs: boolean;
  /** Завершённых тренировок за неделю. */
  workoutsWeek: number;
  /** 0–1 выполнения плана тренировок. */
  workoutAdherence: number;
  hasWorkouts: boolean;
  /** Целей в работе. */
  goalsActive: number;
  /** Целей закрыто за всё время. */
  goalsCompleted: number;
  /** Задач просрочено. */
  tasksOverdue: number;
  /** Дней в приложении. */
  daysWithNova: number;
  /** Съедено против нормы за неделю, 0–1+. Null без цели. */
  caloriesRatio: number | null;
}

export interface LibraryProblem {
  id: LibraryProblemId;
  /** «Ты бросаешь цели через неделю» — то, что человек читает как диагноз. */
  statement: string;
  /** Число, на котором диагноз держится. Показывается рядом. */
  evidence: string;
  /** Насколько это срочно, 0–100. Определяет порядок. */
  weight: number;
}

/**
 * Все диагнозы, которые подтверждаются данными, от важного к менее важному.
 *
 * Пустой список — совершенно нормальный исход: человек, у которого всё в
 * порядке, не должен получать выдуманную проблему ради того, чтобы разделу было
 * что сказать. В этом случае интерфейс показывает каталог без рекомендации.
 */
export function detectProblems(signals: LibrarySignals): LibraryProblem[] {
  const problems: LibraryProblem[] = [];

  // --- Сон: самый верхний слой, потому что он ломает всё остальное ---------
  if (signals.hasSleepLogs && signals.sleepDebtMin >= 120) {
    problems.push({
      id: "sleep_debt",
      statement: "Ты не досыпаешь, и это тянет вниз всё остальное",
      evidence: `За неделю накопилось ${formatHours(signals.sleepDebtMin)} недосыпа`,
      weight: 95,
    });
  }

  if (signals.bedTimeSpreadMin !== null && signals.bedTimeSpreadMin >= 90) {
    problems.push({
      id: "sleep_chaos",
      statement: "Время отхода ко сну гуляет — режима нет",
      evidence: `Разброс отбоя за неделю ${formatHours(signals.bedTimeSpreadMin)}`,
      weight: 80,
    });
  }

  // --- Регулярность: то, из-за чего люди уходят из приложений о здоровье ---
  if (signals.habitsActive > 0 && signals.habitAdherence < 0.6) {
    problems.push({
      id: "quits_early",
      statement: "Ты начинаешь и бросаешь через неделю",
      evidence: `Привычки выполняются на ${Math.round(signals.habitAdherence * 100)}% за неделю`,
      weight: 90,
    });
  }

  if (signals.daysWithNova >= 21 && signals.goalsCompleted === 0 && signals.goalsActive > 0) {
    problems.push({
      id: "quits_early",
      statement: "Цели ставятся, но не закрываются",
      evidence: `${signals.daysWithNova} дней в Nova, закрытых целей пока нет`,
      weight: 70,
    });
  }

  if (signals.tasksOverdue >= 3) {
    problems.push({
      id: "no_system",
      statement: "Дела накапливаются быстрее, чем закрываются",
      evidence: `Просрочено задач: ${signals.tasksOverdue}`,
      weight: 60,
    });
  }

  // --- Питание ------------------------------------------------------------
  if (!signals.hasNutritionGoal) {
    problems.push({
      id: "diet_unknown",
      statement: "Ты не знаешь, сколько и чего ешь",
      evidence: "Норма КБЖУ не задана, дневник не ведётся",
      weight: 75,
    });
  } else if (signals.nutritionAdherence < 0.5) {
    problems.push({
      id: "diet_unknown",
      statement: "Дневник еды заполняется через день — судить по нему нельзя",
      evidence: `Регулярность за неделю ${Math.round(signals.nutritionAdherence * 100)}%`,
      weight: 55,
    });
  }

  if (signals.caloriesRatio !== null && signals.caloriesRatio > 1.15) {
    problems.push({
      id: "overeating",
      statement: "Съедается больше нормы, и это не про силу воли",
      evidence: `За неделю в среднем ${Math.round(signals.caloriesRatio * 100)}% от нормы калорий`,
      weight: 85,
    });
  }

  if (signals.proteinRatio !== null && signals.proteinRatio < 0.7) {
    problems.push({
      id: "diet_unknown",
      statement: "Белка стабильно не хватает",
      evidence: `В среднем ${Math.round(signals.proteinRatio * 100)}% от цели по белку`,
      weight: 50,
    });
  }

  // --- Тренировки ---------------------------------------------------------
  if (!signals.hasWorkouts) {
    problems.push({
      id: "no_training",
      statement: "Тренировок нет — начинать не с чего",
      evidence: "Ни одной программы в работе",
      weight: 78,
    });
  } else if (signals.workoutsWeek === 0) {
    problems.push({
      id: "no_training",
      statement: "Программа есть, но неделя прошла без тренировок",
      evidence: `Выполнение плана ${Math.round(signals.workoutAdherence * 100)}%`,
      weight: 72,
    });
  } else if (signals.workoutsWeek >= 2 && signals.workoutAdherence >= 0.6) {
    // Единственный «положительный» диагноз: человек тренируется стабильно, и
    // следующий его вопрос — не «как начать», а «как расти дальше».
    problems.push({
      id: "no_progression",
      statement: "Тренировки идут стабильно — пора думать о прогрессии",
      evidence: `${signals.workoutsWeek} тренировки за неделю, план на ${Math.round(signals.workoutAdherence * 100)}%`,
      weight: 40,
    });
  }

  return problems.sort((a, b) => b.weight - a.weight);
}

function formatHours(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  if (hours === 0) return `${mins} мин`;
  return mins === 0 ? `${hours} ч` : `${hours} ч ${mins} мин`;
}
