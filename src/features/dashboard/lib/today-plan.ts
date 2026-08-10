/**
 * План дня — расписание, а не список дел.
 *
 * ЗАЧЕМ. Главный экран отвечал на «как я сегодня», но не отвечал на «что
 * дальше». Между этими двумя вопросами и лежит разница между трекером и
 * тренером: трекер показывает, что уже случилось, тренер говорит, что делать
 * в 13:00.
 *
 * ОТКУДА БЕРУТСЯ ВРЕМЕНА — это главный вопрос к такому блоку, и ответ на него
 * разный для разных строк:
 *
 *   тренировка — из истории самого человека. WorkoutSession.completedAt хранит
 *     момент завершения, и медианный час прошлых сессий это и есть «когда ты
 *     обычно тренируешься». Пока истории нет, строка честно показывает «по
 *     плану» вместо выдуманного «18:00».
 *
 *   сон — из его же записей сна: обычное время отхода минус полчаса на
 *     подготовку. Опять же, пока записей нет, время не выдумывается.
 *
 *   приёмы пищи — единственное место, где время конвенциональное, а не
 *     выведенное: у записи в дневнике нет отметки о времени съеденного, только
 *     слот. Это якоря расписания, а не утверждение о человеке, и MEAL_ANCHORS
 *     ниже — ровно они.
 *
 * Ничего из того, что нельзя вывести, здесь не появляется. Строка без опоры
 * либо показывает «по плану», либо не рендерится вовсе.
 */

import type { MealSlot } from "@/features/nutrition/types";

export type TodayPlanKind = "meal" | "workout" | "water" | "sleep";

/**
 * Состояние строки.
 *
 * `missed` существует отдельно от `upcoming` не ради красного цвета, а потому
 * что это разные советы: пропущенный обед в 17:00 уже не наверстать, а
 * предстоящий ужин — можно спланировать.
 */
export type TodayPlanState = "done" | "now" | "upcoming" | "missed";

export interface TodayPlanItem {
  key: string;
  kind: TodayPlanKind;
  /** "18:00", либо null — когда времени под строкой нет и выдумывать его нельзя. */
  time: string | null;
  title: string;
  subtitle: string;
  state: TodayPlanState;
  href: string;
}

/**
 * Якоря приёмов пищи. Конвенция расписания, а не утверждение о человеке —
 * см. заголовок файла. Минуты от полуночи, чтобы сортировка была арифметикой.
 */
const MEAL_ANCHORS: Record<MealSlot, number> = {
  breakfast: 8 * 60 + 30,
  lunch: 13 * 60,
  snack: 16 * 60 + 30,
  dinner: 19 * 60,
};

const MEAL_TITLES: Record<MealSlot, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  snack: "Перекус",
  dinner: "Ужин",
};

/** Порядок, в котором слоты идут по дню. */
const MEAL_ORDER: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

/** Сколько минут вокруг якоря строка считается «сейчас». */
const NOW_WINDOW_MIN = 45;

/** Насколько нужно отстать от якоря, чтобы приём пищи считался пропущенным. */
const MISSED_AFTER_MIN = 150;

/** Сколько заложено на подготовку ко сну. */
const SLEEP_PREP_MIN = 30;

export interface TodayPlanInput {
  /** Локальное время в минутах от полуночи. */
  nowMinutes: number;

  meals: {
    slot: MealSlot;
    /** Записано ли в этот слот хоть что-то сегодня. */
    isLogged: boolean;
    /** Ккал, уже записанные в слот. */
    calories: number;
  }[];

  /** Сколько белка ещё не добрано за день — попадает в подсказку к ужину. */
  proteinGapG: number;

  workout: {
    /** Название программы дня — и когда она ещё предстоит, и когда уже закрыта. */
    title: string | null;
    isRestDay: boolean;
    isDone: boolean;
    isOpen: boolean;
    exerciseCount: number;
    /** Обычный час тренировок, выведенный из истории. null — истории нет. */
    usualHour: number | null;
  };

  water: {
    ml: number;
    goalMl: number;
  };

  sleep: {
    /** Обычное время отхода ко сну "23:10". null — записей нет. */
    usualBedTime: string | null;
    /** Записана ли уже прошедшая ночь. */
    isLoggedToday: boolean;
    /** Личная норма сна в минутах — идёт в подпись. */
    normMin: number;
  };
}

function formatClock(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} ч` : `${hours} ч ${mins} мин`;
}

/** Состояние строки по её якорю и по тому, сделана ли она. */
function stateOf(
  anchorMin: number | null,
  nowMinutes: number,
  isDone: boolean,
  missedAfterMin: number,
): TodayPlanState {
  if (isDone) return "done";
  if (anchorMin === null) return "upcoming";

  const delta = nowMinutes - anchorMin;

  if (delta > missedAfterMin) return "missed";
  if (delta >= -NOW_WINDOW_MIN) return "now";
  return "upcoming";
}

/**
 * Собрать расписание дня.
 *
 * Возвращает уже отсортированный список. Сортировка идёт по якорю, а строки без
 * времени встают после последнего события, к которому они привязаны по смыслу —
 * тренировка без истории идёт после обеда, потому что это середина дня, а не
 * потому что мы знаем её час.
 */
export function buildTodayPlan(input: TodayPlanInput): TodayPlanItem[] {
  const { nowMinutes, meals, workout, water, sleep, proteinGapG } = input;

  const rows: { sortKey: number; item: TodayPlanItem }[] = [];

  // --- Приёмы пищи -------------------------------------------------------
  const loggedBySlot = new Map(meals.map((meal) => [meal.slot, meal]));

  for (const slot of MEAL_ORDER) {
    const anchor = MEAL_ANCHORS[slot];
    const logged = loggedBySlot.get(slot);
    const isLogged = logged?.isLogged ?? false;

    // Перекус показывается только когда он либо уже записан, либо впереди:
    // напоминать в 21:00 о пропущенном перекусе — шум, а не совет.
    if (slot === "snack" && !isLogged && nowMinutes > anchor + MISSED_AFTER_MIN) {
      continue;
    }

    const state = stateOf(anchor, nowMinutes, isLogged, MISSED_AFTER_MIN);

    rows.push({
      sortKey: anchor,
      item: {
        key: `meal-${slot}`,
        kind: "meal",
        time: formatClock(anchor),
        title: MEAL_TITLES[slot],
        subtitle: isLogged
          ? `Записано · ${Math.round(logged?.calories ?? 0)} ккал`
          : slot === "dinner" && proteinGapG > 15
            ? `Добрать ${Math.round(proteinGapG)} г белка`
            : state === "missed"
              ? "Не записан"
              : "Записать приём пищи",
        state,
        // Слот едет в адресе: раздел «Питание» откроет выбор продукта уже
        // нацеленным на тот приём пищи, по которому нажали. Без него строка
        // «Ужин» открывала бы форму с завтраком по умолчанию.
        href: `/nutrition?add=food&slot=${slot}`,
      },
    });
  }

  // --- Тренировка --------------------------------------------------------
  if (!workout.isRestDay && workout.title) {
    // Час из истории, если он есть. Иначе строка идёт без времени и встаёт
    // после обеда — см. заголовок файла.
    const anchor = workout.usualHour === null ? null : workout.usualHour * 60;
    const sortKey = anchor ?? MEAL_ANCHORS.lunch + 60;

    rows.push({
      sortKey,
      item: {
        key: "workout",
        kind: "workout",
        time: anchor === null ? null : formatClock(anchor),
        title: workout.title,
        subtitle: workout.isDone
          ? "Выполнена"
          : workout.isOpen
            ? "Тренировка идёт — продолжить"
            : `${workout.exerciseCount} упр. · по плану на сегодня`,
        state: stateOf(anchor, nowMinutes, workout.isDone, 24 * 60),
        href: "/workouts",
      },
    });
  }

  // --- Вода --------------------------------------------------------------
  // Одна строка на весь день, а не напоминание каждые два часа: приложение,
  // которое пишет о воде восемь раз, читается как будильник.
  if (water.goalMl > 0 && water.ml < water.goalMl) {
    const remaining = water.goalMl - water.ml;

    rows.push({
      // В конце дневной части, перед подготовкой ко сну.
      sortKey: MEAL_ANCHORS.dinner + 30,
      item: {
        key: "water",
        kind: "water",
        time: null,
        title: "Вода",
        subtitle: `Осталось ${(remaining / 1000).toFixed(1).replace(".", ",")} л до нормы`,
        state: "upcoming",
        href: "/nutrition?add=water",
      },
    });
  }

  // --- Незаписанная ночь -------------------------------------------------
  // Утренняя строка, и только утренняя: напоминать в 21:00 о том, что не
  // записана прошлая ночь, поздно — человек уже прожил день. Времени у строки
  // нет, потому что вывести его не из чего; она встаёт первой, до завтрака.
  if (!sleep.isLoggedToday && nowMinutes < 12 * 60) {
    rows.push({
      sortKey: -1,
      item: {
        key: "sleep-log",
        kind: "sleep",
        time: null,
        title: "Записать сон",
        subtitle: "Во сколько лёг и встал — от этого считается восстановление",
        state: "now",
        href: "/sleep?add=1",
      },
    });
  }

  // --- Подготовка ко сну -------------------------------------------------
  const bedMinutes = sleep.usualBedTime === null ? null : parseClock(sleep.usualBedTime);

  if (bedMinutes !== null) {
    const prepMinutes = bedMinutes - SLEEP_PREP_MIN;
    // Время отхода ко сну лежит либо поздно вечером, либо уже за полночь.
    // Во втором случае оно всё равно принадлежит концу этого дня, поэтому
    // ключ сортировки поднимается за пределы суток, а не уводит строку в начало.
    const sortKey = prepMinutes < 12 * 60 ? prepMinutes + 24 * 60 : prepMinutes;

    rows.push({
      sortKey,
      item: {
        key: "sleep",
        kind: "sleep",
        time: formatClock(prepMinutes),
        title: "Подготовка ко сну",
        subtitle: `Норма ${formatHours(sleep.normMin)} — отбой около ${formatClock(bedMinutes)}`,
        state: nowMinutes >= prepMinutes && prepMinutes >= 12 * 60 ? "now" : "upcoming",
        href: "/sleep",
      },
    });
  }

  return rows.sort((a, b) => a.sortKey - b.sortKey).map((row) => row.item);
}
