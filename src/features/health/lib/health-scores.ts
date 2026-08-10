/**
 * Четыре состояния организма, из которых собран главный экран.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. Дашборд показывал четыре плитки сырых чисел —
 * «1840 ккал», «7 ч 20 м», «1/2», «1,4 л». Каждое из них правда, и ни одно из
 * них не отвечает на вопрос, с которым человек открывает приложение о здоровье:
 * «как я сегодня и что с этим делать». Число нужно интерпретировать; четыре
 * числа нужно интерпретировать одновременно, и это работа продукта, а не
 * пользователя.
 *
 * ЧЕГО ЗДЕСЬ СОЗНАТЕЛЬНО НЕТ. Ни один скор не выдуман и не «нормализован» до
 * красивой цифры. У приложения нет носимого устройства: нет пульса, нет ВСР,
 * нет фаз сна — поэтому нет и «Recovery 84%», списанного с Whoop. Всё ниже
 * выведено ровно из того, что человек сам записал: время сна и его оценка,
 * дневник еды, вода, выполненные тренировки. Где данных нет — компонент не
 * участвует в счёте вовсе (см. `measured`), а не подставляет ноль: «не записал»
 * и «сделал плохо» — разные факты, и только второй является виной человека.
 *
 * ОТСЮДА ГЛАВНОЕ СВОЙСТВО: скор считается по сумме измеримых компонентов,
 * делённой на сумму их максимумов. Пользователь, записавший только сон, увидит
 * честную оценку по сну, а не 30 из 100 за то, что не завёл дневник питания.
 * Когда измерять нечего — `value: null`, и карточка показывает приглашение к
 * действию вместо цифры.
 */

/** Идентичен по форме SleepScoreComponent — сон уже устроен именно так. */
export interface HealthScoreComponent {
  key: string;
  label: string;
  /** Набранное. Имеет смысл только когда `measured`. */
  score: number;
  maxScore: number;
  /**
   * Есть ли вообще данные под этим компонентом. Неизмеренный компонент
   * выпадает и из числителя, и из знаменателя.
   */
  measured: boolean;
  /** Одна строка, которую интерфейс показывает дословно. */
  note: string;
}

export type HealthScoreKey = "energy" | "sleep" | "nutrition" | "recovery";

export interface HealthScore {
  key: HealthScoreKey;
  label: string;
  /** 0–100, либо null, когда измерять нечего. */
  value: number | null;
  /** Что эта цифра значит — вердикт, а не повтор числа. */
  verdict: string;
  /**
   * Почему она такая: самый слабый измеренный компонент, названный словами.
   * Это то, что превращает индикатор в объяснение.
   */
  reason: string;
  /** Куда ведёт нажатие. */
  href: string;
  /** Что предложить, когда value === null. */
  emptyAction: string;
  components: HealthScoreComponent[];
}

// ---------------------------------------------------------------------------
// Вход
// ---------------------------------------------------------------------------

export interface HealthScoreInput {
  /** Локальный час 0–23. Дню, который ещё не кончился, нельзя выставлять счёт как законченному. */
  localHour: number;

  sleep: {
    /** Оценка прошедшей ночи 0–100, либо null — ночь не записана. */
    score: number | null;
    /** Накопленный за неделю недосып против личной нормы, в минутах. */
    weekDeficitMin: number;
    /** Норма, против которой считается недосып. */
    normMin: number;
    /** Есть ли вообще записи сна — отличает «плохо спит» от «ни разу не записывал». */
    hasLogs: boolean;
    /** Ночей записано за последние 7 дней. */
    nightsLoggedWeek: number;
  };

  nutrition: {
    hasGoal: boolean;
    caloriesValue: number;
    caloriesGoal: number;
    proteinValue: number;
    proteinGoal: number;
    waterValue: number;
    waterGoal: number;
    /** Есть ли хоть одна запись за сегодня. */
    hasEntriesToday: boolean;
    /** Дней с дневником / дней ожидалось за окно, 0–1. */
    adherence: number;
  };

  /**
   * Нагрузка. Здесь намеренно нет ни недельного объёма, ни выполнения плана:
   * восстановление — про то, успело ли тело отдохнуть, а не про то, много ли
   * человек тренируется. Свежая нагрузка за три дня отвечает на первый вопрос,
   * недельный объём — на второй, и он живёт в NOVA Score.
   */
  training: {
    /** Завершённых сессий за последние 3 дня — мера свежей нагрузки. */
    sessionsLast3Days: number;
    /** Дней с последней завершённой тренировки, null — их не было ни разу. */
    daysSinceLastSession: number | null;
  };
}

// ---------------------------------------------------------------------------
// Общая арифметика
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Какую долю дневной нормы разумно съесть/выпить к этому часу.
 *
 * Без этой кривой любой скор питания до ужина был бы провальным: в 11 утра
 * человек честно съел 20% дневных калорий, и оценивать это как «20 из 100» —
 * значит наказывать за то, что день ещё идёт. Точки взяты по обычному ритму
 * приёмов пищи, между ними — линейная интерполяция.
 */
function dayShareByHour(hour: number): number {
  const POINTS: [number, number][] = [
    [6, 0.02],
    [10, 0.2],
    [14, 0.5],
    [18, 0.72],
    [21, 0.95],
    [23, 1],
  ];

  if (hour <= POINTS[0][0]) return POINTS[0][1];

  for (let index = 1; index < POINTS.length; index += 1) {
    const [prevHour, prevShare] = POINTS[index - 1];
    const [nextHour, nextShare] = POINTS[index];

    if (hour <= nextHour) {
      const t = (hour - prevHour) / (nextHour - prevHour);
      return prevShare + t * (nextShare - prevShare);
    }
  }

  return 1;
}

/**
 * Насколько съеденное попадает в то, что к этому часу ожидается.
 *
 * Недобор и перебор наказываются по-разному и это принципиально: не доесть в
 * 14:00 — нормальный ход дня, а превысить дневную норму в 14:00 уже не
 * исправить. Поэтому недобор меряется против ожидаемой к часу доли, а перебор —
 * против полной дневной цели с допуском 10%.
 */
function targetProximity(value: number, goal: number, hour: number): number {
  if (goal <= 0) return 0;

  const expected = goal * dayShareByHour(hour);
  const overshootFrom = goal * 1.1;

  if (value > overshootFrom) {
    // Ноль достигается на 40% сверх цели: 2800 при цели 2000 — это уже не
    // «чуть больше», а другой день.
    return clamp01(1 - (value - overshootFrom) / (goal * 0.4));
  }

  return expected <= 0 ? 1 : clamp01(value / expected);
}

function formatHours(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  if (hours === 0) return `${mins} мин`;
  return mins === 0 ? `${hours} ч` : `${hours} ч ${mins} мин`;
}

/**
 * Свернуть компоненты в счёт.
 *
 * Знаменатель — сумма максимумов только измеренных компонентов. Это то самое
 * место, где «нет данных» перестаёт быть штрафом.
 */
function rollUp(components: HealthScoreComponent[]): number | null {
  const measured = components.filter((component) => component.measured);
  if (measured.length === 0) return null;

  const earned = measured.reduce((total, component) => total + component.score, 0);
  const possible = measured.reduce((total, component) => total + component.maxScore, 0);

  return possible === 0 ? null : Math.round((earned / possible) * 100);
}

/** Самый слабый измеренный компонент — то, что объясняет цифру. */
function weakest(components: HealthScoreComponent[]): HealthScoreComponent | null {
  const measured = components.filter((component) => component.measured && component.maxScore > 0);
  if (measured.length === 0) return null;

  return [...measured].sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)[0];
}

/** Самый сильный — им объясняется хороший счёт, чтобы похвала была конкретной. */
function strongest(components: HealthScoreComponent[]): HealthScoreComponent | null {
  const measured = components.filter((component) => component.measured && component.maxScore > 0);
  if (measured.length === 0) return null;

  return [...measured].sort((a, b) => b.score / b.maxScore - a.score / a.maxScore)[0];
}

/**
 * Объяснение под цифрой.
 *
 * Хороший счёт объясняется тем, что работает, плохой — тем, что мешает. Иначе
 * карточка с 90 из 100 писала бы «качество сна ниже всего», и человек читал бы
 * упрёк там, где всё в порядке.
 */
function explain(components: HealthScoreComponent[], value: number): string {
  const driver = value >= 75 ? strongest(components) : weakest(components);
  return driver?.note ?? "";
}

// ---------------------------------------------------------------------------
// Сон
// ---------------------------------------------------------------------------

function sleepVerdict(value: number): string {
  if (value >= 85) return "Отличная ночь";
  if (value >= 70) return "Восстановился";
  if (value >= 50) return "Так себе ночь";
  return "Недосып";
}

/**
 * Сон уже посчитан в features/sleep/lib/score.ts — здесь он только приводится
 * к общей форме. Второй формулы сна в приложении быть не должно: экран «Сон» и
 * главный экран обязаны показывать одно число.
 */
function buildSleep(input: HealthScoreInput): HealthScore {
  const { score, weekDeficitMin, normMin, hasLogs, nightsLoggedWeek } = input.sleep;

  const components: HealthScoreComponent[] =
    score === null
      ? []
      : [
          {
            key: "night",
            label: "Прошлая ночь",
            score,
            maxScore: 100,
            measured: true,
            note:
              score >= 75
                ? `Ночь закрыта на ${score} из 100 — норма ${formatHours(normMin)} выдержана`
                : `Ночь на ${score} из 100 при норме ${formatHours(normMin)}`,
          },
        ];

  return {
    key: "sleep",
    label: "Сон",
    value: score,
    verdict: score === null ? (hasLogs ? "Ночь не записана" : "Нет данных") : sleepVerdict(score),
    reason:
      score === null
        ? hasLogs
          ? "Отметь, во сколько лёг и встал — это займёт секунду"
          : "Первая ночь запустит личную норму сна"
        : weekDeficitMin >= 120
          ? `За неделю накопилось ${formatHours(weekDeficitMin)} недосыпа`
          : nightsLoggedWeek >= 5
            ? `${nightsLoggedWeek} ночей за неделю — норме есть на что опереться`
            : (components[0]?.note ?? ""),
    href: "/sleep",
    emptyAction: "Записать ночь",
    components,
  };
}

// ---------------------------------------------------------------------------
// Энергия — сколько топлива есть на сегодня
// ---------------------------------------------------------------------------

function energyVerdict(value: number): string {
  if (value >= 80) return "Полный бак";
  if (value >= 60) return "Рабочее состояние";
  if (value >= 40) return "На половине";
  return "На нуле";
}

/**
 * Энергия — единственный скор, смотрящий вперёд, а не назад.
 *
 * Остальные три оценивают, что уже случилось; этот отвечает на вопрос «что я
 * сегодня потяну». Отсюда состав: отдых как источник, еда и вода как топливо,
 * которое ещё поступает в течение дня.
 */
function buildEnergy(input: HealthScoreInput): HealthScore {
  const { sleep, nutrition, localHour } = input;

  const fuelRatio = targetProximity(nutrition.caloriesValue, nutrition.caloriesGoal, localHour);
  const waterRatio = targetProximity(nutrition.waterValue, nutrition.waterGoal, localHour);

  const components: HealthScoreComponent[] = [
    {
      key: "rest",
      label: "Отдых",
      score: Math.round(45 * ((sleep.score ?? 0) / 100)),
      maxScore: 45,
      measured: sleep.score !== null,
      note:
        sleep.score === null
          ? ""
          : sleep.score >= 75
            ? "Выспался — это главный источник энергии на сегодня"
            : `Ночь на ${sleep.score} из 100 — днём это чувствуется`,
    },
    {
      key: "fuel",
      label: "Топливо",
      score: Math.round(35 * fuelRatio),
      maxScore: 35,
      measured: nutrition.hasGoal && nutrition.hasEntriesToday,
      note:
        fuelRatio >= 0.8
          ? "По калориям идёшь ровно в график дня"
          : nutrition.caloriesValue > nutrition.caloriesGoal * 1.1
            ? `${Math.round(nutrition.caloriesValue - nutrition.caloriesGoal)} ккал сверх цели — отсюда тяжесть`
            : `К этому часу съедено меньше обычного: ${Math.round(nutrition.caloriesValue)} ккал`,
    },
    {
      key: "hydration",
      label: "Вода",
      score: Math.round(20 * waterRatio),
      maxScore: 20,
      measured: nutrition.waterGoal > 0 && nutrition.waterValue > 0,
      note:
        waterRatio >= 0.8
          ? "Воды достаточно"
          : `Выпито ${(nutrition.waterValue / 1000).toFixed(1).replace(".", ",")} л — обезвоживание бьёт по энергии раньше голода`,
    },
  ];

  const value = rollUp(components);

  return {
    key: "energy",
    label: "Энергия",
    value,
    verdict: value === null ? "Нет данных" : energyVerdict(value),
    reason:
      value === null
        ? "Запиши ночь или приём пищи — Nova посчитает, на что хватит сил"
        : explain(components, value),
    href: "/nutrition",
    emptyAction: "Записать день",
    components,
  };
}

// ---------------------------------------------------------------------------
// Питание
// ---------------------------------------------------------------------------

function nutritionVerdict(value: number): string {
  if (value >= 80) return "В цели";
  if (value >= 60) return "Близко к цели";
  if (value >= 40) return "Есть перекос";
  return "Мимо плана";
}

/**
 * Питание меряет не «сколько съедено», а «насколько день собран по плану».
 *
 * Отсюда четвёртый компонент — регулярность дневника. Один идеальный день из
 * семи не делает питание хорошим, и скор, который этого не видит, врёт в
 * приятную сторону.
 */
function buildNutrition(input: HealthScoreInput): HealthScore {
  const { nutrition, localHour } = input;

  const caloriesRatio = targetProximity(nutrition.caloriesValue, nutrition.caloriesGoal, localHour);
  const proteinRatio = targetProximity(nutrition.proteinValue, nutrition.proteinGoal, localHour);
  const waterRatio = targetProximity(nutrition.waterValue, nutrition.waterGoal, localHour);

  const proteinGap = Math.max(0, Math.round(nutrition.proteinGoal - nutrition.proteinValue));

  const components: HealthScoreComponent[] = [
    {
      key: "calories",
      label: "Калории",
      score: Math.round(40 * caloriesRatio),
      maxScore: 40,
      measured: nutrition.hasGoal && nutrition.hasEntriesToday,
      note:
        nutrition.caloriesValue > nutrition.caloriesGoal * 1.1
          ? `${Math.round(nutrition.caloriesValue)} ккал против цели ${nutrition.caloriesGoal}`
          : caloriesRatio >= 0.8
            ? `${Math.round(nutrition.caloriesValue)} из ${nutrition.caloriesGoal} ккал — в графике`
            : `${Math.round(nutrition.caloriesValue)} из ${nutrition.caloriesGoal} ккал`,
    },
    {
      key: "protein",
      label: "Белок",
      score: Math.round(30 * proteinRatio),
      maxScore: 30,
      measured: nutrition.proteinGoal > 0 && nutrition.hasEntriesToday,
      note:
        proteinRatio >= 0.8
          ? `Белок закрыт: ${Math.round(nutrition.proteinValue)} г`
          : `Белок ниже цели — ${Math.round(nutrition.proteinValue)} из ${nutrition.proteinGoal} г, не хватает ${proteinGap} г`,
    },
    {
      key: "water",
      label: "Вода",
      score: Math.round(15 * waterRatio),
      maxScore: 15,
      measured: nutrition.waterGoal > 0,
      note:
        waterRatio >= 0.8
          ? "Вода в норме"
          : `Вода: ${(nutrition.waterValue / 1000).toFixed(1).replace(".", ",")} из ${(nutrition.waterGoal / 1000).toFixed(1).replace(".", ",")} л`,
    },
    {
      key: "consistency",
      label: "Регулярность",
      score: Math.round(15 * clamp01(nutrition.adherence)),
      maxScore: 15,
      measured: nutrition.hasGoal,
      note:
        nutrition.adherence >= 0.8
          ? "Дневник ведётся стабильно — по нему уже можно судить"
          : "Дневник заполняется через день — цифрам пока не на что опереться",
    },
  ];

  const value = rollUp(components);

  return {
    key: "nutrition",
    label: "Питание",
    value,
    verdict:
      value === null
        ? nutrition.hasGoal
          ? "День не записан"
          : "Цель не задана"
        : nutritionVerdict(value),
    reason:
      value === null
        ? nutrition.hasGoal
          ? "Добавь первый приём пищи — КБЖУ Nova посчитает сама"
          : "Nova рассчитает норму по твоим параметрам"
        : explain(components, value),
    href: "/nutrition",
    emptyAction: nutrition.hasGoal ? "Записать еду" : "Рассчитать норму",
    components,
  };
}

// ---------------------------------------------------------------------------
// Восстановление
// ---------------------------------------------------------------------------

function recoveryVerdict(value: number): string {
  if (value >= 80) return "Готов к нагрузке";
  if (value >= 60) return "Можно тренироваться";
  if (value >= 40) return "Снизить интенсивность";
  return "Нужен отдых";
}

/**
 * Восстановление — готовность принять нагрузку сегодня.
 *
 * Это единственный скор, где высокая цифра является разрешением, а низкая —
 * запретом, поэтому он собран из того, что реально ограничивает: накопленный
 * недосып (главный тормоз восстановления), качество последней ночи и свежая
 * нагрузка. Три тренировки за три дня опускают его сознательно — это не
 * наказание за усердие, а то, ради чего скор существует.
 */
function buildRecovery(input: HealthScoreInput): HealthScore {
  const { sleep, training } = input;

  // Ноль достигается на семи часах недосыпа за неделю — это примерно одна
  // полностью потерянная ночь, после которой говорить о восстановлении нечего.
  const debtRatio = clamp01(1 - sleep.weekDeficitMin / 420);

  // Свежая нагрузка за трое суток. Ступенями, а не формулой: разница между
  // «ноль тренировок» и «одна» качественная, между «третьей» и «четвёртой» —
  // уже нет, и кривая, продолжающая падать, наказывала бы за объём, которым
  // восстановление не измеряется.
  const LOAD_BY_SESSIONS = [1, 0.85, 0.62, 0.42] as const;
  const loadRatio = LOAD_BY_SESSIONS[Math.min(training.sessionsLast3Days, 3)];

  const components: HealthScoreComponent[] = [
    {
      key: "debt",
      label: "Недосып за неделю",
      score: Math.round(45 * debtRatio),
      maxScore: 45,
      measured: sleep.hasLogs && sleep.nightsLoggedWeek > 0,
      note:
        sleep.weekDeficitMin <= 60
          ? "Недосыпа за неделю почти нет — организм не в долгу"
          : `Недосып за неделю: ${formatHours(sleep.weekDeficitMin)}. Это главный тормоз восстановления`,
    },
    {
      key: "lastNight",
      label: "Последняя ночь",
      score: Math.round(30 * ((sleep.score ?? 0) / 100)),
      maxScore: 30,
      measured: sleep.score !== null,
      note:
        (sleep.score ?? 0) >= 75
          ? "Прошлая ночь отработала на восстановление"
          : "Короткая ночь — сегодня лучше снизить интенсивность",
    },
    {
      key: "load",
      label: "Свежая нагрузка",
      score: Math.round(25 * loadRatio),
      maxScore: 25,
      measured: training.daysSinceLastSession !== null,
      note:
        training.sessionsLast3Days === 0
          ? "Три дня без тренировок — тело отдохнуло"
          : training.sessionsLast3Days >= 3
            ? `${training.sessionsLast3Days} тренировки за три дня — телу нужен день без нагрузки`
            : `${training.sessionsLast3Days} тренировка за последние три дня`,
    },
  ];

  const value = rollUp(components);

  return {
    key: "recovery",
    label: "Восстановление",
    value,
    verdict: value === null ? "Нет данных" : recoveryVerdict(value),
    reason:
      value === null
        ? "Восстановление считается по сну — запиши первую ночь"
        : explain(components, value),
    href: "/workouts",
    emptyAction: "Записать ночь",
    components,
  };
}

// ---------------------------------------------------------------------------
// Сборка
// ---------------------------------------------------------------------------

/**
 * Порядок — это утверждение.
 *
 * Энергия первая, потому что это единственный ответ на «что я сегодня потяну»;
 * восстановление последнее, потому что это вывод из трёх предыдущих. Экран
 * читается слева направо как «сколько сил → откуда они → чем заправлен →
 * что можно себе позволить».
 */
export function calculateHealthScores(input: HealthScoreInput): HealthScore[] {
  return [buildEnergy(input), buildSleep(input), buildNutrition(input), buildRecovery(input)];
}

/**
 * Одна строка на весь экран — то, что Nova говорит вместо приветствия.
 *
 * Берёт самый слабый измеренный скор и называет фокус дня. Это то самое
 * «Сегодня твоё восстановление 84%, лучший фокус — питание», только собранное
 * из настоящих чисел, а не из шаблона.
 */
export function summarizeHealth(scores: HealthScore[], firstName: string): string {
  const measured = scores.filter((score) => score.value !== null);

  if (measured.length === 0) {
    return `${firstName}, начнём с малого — запиши сон или первый приём пищи, и Nova соберёт картину дня.`;
  }

  const lowest = [...measured].sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0];
  const highest = [...measured].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];

  if ((lowest.value ?? 0) >= 75) {
    return `Все системы в норме, ${lowest.label.toLowerCase()} — ${lowest.value}. Сегодня можно добавить нагрузки.`;
  }

  return `${highest.label} держится на ${highest.value}. Слабое место дня — ${lowest.label.toLowerCase()}: ${lowest.value} из 100.`;
}
