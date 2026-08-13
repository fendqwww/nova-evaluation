/**
 * NOVA Score — насколько выполнен сегодняшний день.
 *
 * ЧТО ЭТО ЗАМЕНИЛО И ПОЧЕМУ. На главном экране стояли четыре «состояния
 * организма» (Энергия, Сон, Питание, Восстановление) — интерпретации, каждая со
 * своим вердиктом, своим объяснением и своей внутренней формулой. Вокруг них
 * кольцом лежал ещё и общий индекс из девяти блоков, в который эти четыре плитки
 * не входили: карточка честно предупреждала комментарием, что центр — не сумма
 * плиток, но человеку, который смотрит на экран, комментарий не виден. Получался
 * блок, где пять чисел не связаны друг с другом ни одним арифметическим
 * действием.
 *
 * Здесь ровно одна арифметика и ни одной интерпретации: четыре доли выполнения
 * дневного плана и их среднее в центре. Центр — это буквально среднее плиток,
 * поэтому вопрос «почему 58» закрывается взглядом, а не модалкой.
 *
 * НИ ОДНОГО ВЫДУМАННОГО ПРОЦЕНТА. Метрика, под которой нет ни цели, ни записи,
 * получает `percent: null` и выпадает из среднего целиком — она не ноль. «Не
 * записал» и «сделал на ноль» — разные факты, и только второй является виной
 * человека. Когда измерять нечего вообще, среднее тоже null, и карточка говорит
 * «Недостаточно данных» вместо 0%.
 *
 * Индекс из девяти блоков (calculate-life-score.ts) никуда не делся: он остался
 * там, где отвечает на свой вопрос — в Отчётах за период, в Профиле и в разборе
 * Коуча. На главный экран он больше не выходит, потому что «как прожит сегодня»
 * и «как идёт неделя» — два разных вопроса, и один из них здесь лишний.
 */

export type DayMetricKey = "nutrition" | "water" | "workout" | "sleep";

export interface DayMetric {
  key: DayMetricKey;
  label: string;
  /** Доля выполнения дневного плана, 0–100. null — измерять нечего. */
  percent: number | null;
  /** Сам факт под процентом: «1850 / 2200 ккал». Показывается дословно. */
  detail: string;
  href: string;
}

export interface DayScore {
  metrics: DayMetric[];
  /** Среднее по измеримым метрикам. null — не измерено ничего. */
  percent: number | null;
  /** Сколько метрик поучаствовало в среднем — из скольких возможных. */
  measured: number;
}

export interface DayScoreInput {
  nutrition: {
    calories: number;
    caloriesGoal: number;
    waterMl: number;
    waterGoalMl: number;
  };
  workout: {
    /** Программ, запланированных на сегодня. */
    plannedToday: number;
    /** Из них закрытых. */
    doneToday: number;
  };
  sleep: {
    /** Длительность прошлой ночи в минутах. null — ночь не записана. */
    lastNightMin: number | null;
    /** Личная норма, против которой считается доля. */
    normMin: number;
  };
}

/**
 * Доля, обрезанная сверху сотней.
 *
 * Перевыполнение не считается: съесть 3000 ккал при цели 2200 — это не 136%
 * выполненного плана, а промах в другую сторону, и показывать его как
 * перевыполнение значило бы хвалить за переедание. Отдельного штрафа за перебор
 * здесь тоже нет — оценка перебора живёт на экране питания, где под неё есть
 * место для объяснения.
 */
function share(value: number, goal: number): number | null {
  if (goal <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (value / goal) * 100)));
}

/** «8 ч 20 м» — та же форма, что на экране сна. */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} м`;
  return mins === 0 ? `${hours} ч` : `${hours} ч ${mins} м`;
}

/** «1,2 / 2,5 л» — литры с запятой, как их пишут по-русски. */
function formatLitres(ml: number): string {
  return (ml / 1000).toFixed(1).replace(".", ",");
}

function buildNutrition(input: DayScoreInput["nutrition"]): DayMetric {
  const percent = share(input.calories, input.caloriesGoal);

  return {
    key: "nutrition",
    label: "КБЖУ",
    percent,
    detail:
      percent === null
        ? "Цель не задана"
        : `${Math.round(input.calories)} / ${input.caloriesGoal} ккал`,
    href: "/nutrition",
  };
}

function buildWater(input: DayScoreInput["nutrition"]): DayMetric {
  const percent = share(input.waterMl, input.waterGoalMl);

  return {
    key: "water",
    label: "Вода",
    percent,
    detail:
      percent === null
        ? "Норма не задана"
        : `${formatLitres(input.waterMl)} / ${formatLitres(input.waterGoalMl)} л`,
    href: "/nutrition",
  };
}

/**
 * Тренировки за сегодня.
 *
 * День без запланированных программ — не ноль процентов, а день отдыха, и
 * метрика из среднего выпадает: расписание, которое само поставило выходной, не
 * может за него же и штрафовать. Тренировка, сделанная в незапланированный
 * день, при этом засчитывается полностью — сделанное всегда сильнее плана.
 */
function buildWorkout(input: DayScoreInput["workout"]): DayMetric {
  const { plannedToday, doneToday } = input;

  if (plannedToday === 0) {
    return doneToday > 0
      ? {
          key: "workout",
          label: "Тренировки",
          percent: 100,
          detail: doneToday === 1 ? "Выполнена" : `Выполнено: ${doneToday}`,
          href: "/workouts",
        }
      : {
          key: "workout",
          label: "Тренировки",
          percent: null,
          detail: "День отдыха",
          href: "/workouts",
        };
  }

  return {
    key: "workout",
    label: "Тренировки",
    percent: share(doneToday, plannedToday),
    detail: `${doneToday} / ${plannedToday}`,
    href: "/workouts",
  };
}

function buildSleep(input: DayScoreInput["sleep"]): DayMetric {
  const { lastNightMin, normMin } = input;

  if (lastNightMin === null) {
    return {
      key: "sleep",
      label: "Сон",
      percent: null,
      detail: "Не записан",
      href: "/sleep",
    };
  }

  return {
    key: "sleep",
    label: "Сон",
    percent: share(lastNightMin, normMin),
    detail: `${formatDuration(lastNightMin)} / ${formatDuration(normMin)}`,
    href: "/sleep",
  };
}

export function buildDayScore(input: DayScoreInput): DayScore {
  const metrics = [
    buildNutrition(input.nutrition),
    buildWater(input.nutrition),
    buildWorkout(input.workout),
    buildSleep(input.sleep),
  ];

  const measured = metrics.filter(
    (metric): metric is DayMetric & { percent: number } => metric.percent !== null,
  );

  return {
    metrics,
    percent:
      measured.length === 0
        ? null
        : Math.round(
            measured.reduce((total, metric) => total + metric.percent, 0) / measured.length,
          ),
    measured: measured.length,
  };
}
