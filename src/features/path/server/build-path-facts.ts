import "server-only";
import type { CoachAnalysis } from "@/features/coach/types";
import { ACTIVITY_LABELS, type ActivityLevel } from "@/features/nutrition/lib/targets";
import { PATH_GOAL_KIND_META, type PathGoalKind } from "@/features/path/lib/goal-kinds";

/**
 * Факты о человеке, которые уезжают в промпт построителя пути.
 *
 * ПОЧЕМУ ЭТО ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ СТРОКА В ЭКШЕНЕ. Правило 1 промпта — «никаких
 * новых чисел» — работает только если все нужные числа приехали посчитанными.
 * Это и есть список того, что модель имеет право знать о человеке, и он должен
 * читаться как список, а не собираться конкатенацией внутри бизнес-логики.
 *
 * Всё берётся из CoachAnalysis — того же снимка, на котором стоят коуч, главный
 * экран и отчёты. Второго измерителя одного и того же дня в приложении быть не
 * должно: путь, построенный на своих собственных подсчётах, рано или поздно
 * начал бы противоречить карточке коуча на главной.
 *
 * Строки на русском, потому что это и есть текст промпта, а не структура данных:
 * модель читает их как факты, и перевод в русский на её стороне был бы лишним
 * шансом ошибиться.
 */
export function buildPathFacts(input: {
  analysis: CoachAnalysis;
  kind: PathGoalKind;
  activityLevel: ActivityLevel | null;
  targetValue: number | null;
}): string[] {
  const { analysis, kind, activityLevel, targetValue } = input;
  const { profile, nutrition, sleep, metrics, trends } = analysis;
  const meta = PATH_GOAL_KIND_META[kind];

  const facts: string[] = [
    `Имя: ${profile.firstName}, ${profile.age} лет, ${profile.gender === "female" ? "женщина" : profile.gender === "male" ? "мужчина" : "пол не указан"}.`,
    `Рост ${profile.heightCm} см, вес ${profile.weightKg} кг, ИМТ ${profile.bmi} (${profile.bmiLabel}).`,
    `Активность: ${activityLevel === null ? "не указана" : ACTIVITY_LABELS[activityLevel]}.`,
    `В приложении ${analysis.clock.daysWithNova} дней.`,
    `Выбранная цель: ${meta.label}.`,
  ];

  if (meta.measure && targetValue !== null) {
    const delta = Math.round(Math.abs(profile.weightKg - targetValue) * 10) / 10;
    facts.push(
      `Целевой вес: ${targetValue} кг, то есть ${meta.measure.direction === "down" ? "минус" : "плюс"} ${delta} кг от текущего.`,
    );
  }

  // --- Питание -------------------------------------------------------------
  if (nutrition.hasGoal) {
    facts.push(
      `Норма калорий: ${nutrition.caloriesGoal} ккал. Средние калории за неделю: ${nutrition.averageCaloriesWeek} ккал (неделей раньше ${nutrition.averageCaloriesPrevWeek}).`,
      `Средний белок за неделю: ${nutrition.averageProteinWeekG} г в день. Дней в цели за неделю: ${nutrition.daysOnTargetWeek} из 7.`,
    );
  } else {
    facts.push("Норма КБЖУ не задана — дневника питания у человека пока нет.");
  }
  facts.push(
    `Дневник питания ведётся ${nutrition.loggingStreak} дней подряд, регулярность за неделю ${Math.round((nutrition.adherence ?? 0) * 100)}%.`,
  );

  // --- Сон -----------------------------------------------------------------
  if (sleep.hasLogs) {
    facts.push(
      `Сон: в среднем ${Math.round(sleep.average7dMin / 60 * 10) / 10} ч за последние 7 дней (неделей раньше ${Math.round(sleep.averagePrev7dMin / 60 * 10) / 10} ч), норма ${Math.round(sleep.goalMin / 60)} ч.`,
      `Недосып за неделю: ${Math.round(sleep.debtWeekMin / 60 * 10) / 10} ч. Ночей записано за неделю: ${sleep.daysLoggedWeek}.`,
    );
    if (sleep.bedTimeSpreadMin !== null) {
      facts.push(
        `Разброс времени отхода ко сну за неделю: ${Math.round(sleep.bedTimeSpreadMin / 60 * 10) / 10} ч.`,
      );
    }
  } else {
    facts.push("Сон ни разу не записан — личной нормы сна пока нет.");
  }

  // --- Тренировки ----------------------------------------------------------
  facts.push(
    `Тренировки: ${metrics.workoutsWeek} завершённых за последнюю неделю (неделей раньше ${trends.workoutsDone.previous}), выполнение плана ${Math.round(metrics.workoutAdherence * 100)}%.`,
    analysis.daysSinceLastWorkout === null
      ? "Завершённых тренировок не было ни разу."
      : `С последней тренировки прошло дней: ${analysis.daysSinceLastWorkout}.`,
  );

  if (analysis.workouts.length > 0) {
    facts.push(
      `Активные программы: ${analysis.workouts.map((workout) => `${workout.title} (${workout.plan})`).join("; ")}.`,
    );
  } else {
    facts.push("Программ тренировок нет — их ещё нужно создать.");
  }

  // --- Привычки и цели -----------------------------------------------------
  facts.push(
    `Привычки: выполнение за неделю ${Math.round(metrics.habitAdherence * 100)}%, активных целей ${metrics.goalsActive}.`,
    `NOVA Score сегодня: ${metrics.lifeScore.score} из 100.`,
  );

  return facts;
}
