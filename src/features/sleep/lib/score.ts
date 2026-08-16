import { addDays, type CalendarDay } from "@/shared/lib/calendar-day";
import { logOnDay, SLEEP_GOAL_MIN } from "@/features/sleep/lib/stats";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * Sleep Score — how last night went, out of 100.
 *
 * WHAT THIS DELIBERATELY DOES NOT MEASURE. There are no sleep phases here: no
 * deep sleep, no REM, no restfulness curve. This app has no wearable and no
 * sensor — every one of those numbers would be invented, and an invented number
 * on a health screen is worse than an absent one. What it does have is when the
 * user went to bed, when they got up, and how they said they felt, three nights
 * a week or seven. Everything below is derived from exactly that.
 *
 * Three components, because three different things go wrong with sleep:
 *
 *   duration (50)    — did you sleep enough, against YOUR normal rather than a
 *                      poster on a wall. A person who runs on 7h is not failing.
 *   regularity (30)  — did you go to bed at roughly your usual hour. This is the
 *                      component nobody tracks by hand and the one most likely
 *                      to explain a bad week, which is exactly why it is worth
 *                      thirty points and not five.
 *   quality (20)     — the star rating. It is subjective and it is the smallest
 *                      block for that reason, but it is also the only signal
 *                      here that comes from the person rather than the clock.
 */

/** Nights looked back over when working out what "normal" is for this person. */
export const SLEEP_BASELINE_DAYS = 14;

/**
 * Until there are this many logged nights, the personal norm is not trustworthy
 * and the fixed 8h target stands in. Four nights is the point at which an
 * average stops being one unusual weekend.
 */
export const SLEEP_BASELINE_MIN_NIGHTS = 4;

/** A personal norm is only honoured inside this band — outside it, 8h wins. */
const NORM_FLOOR_MIN = 5 * 60;
const NORM_CEILING_MIN = 10 * 60;

/**
 * ЧЕТВЁРТЫЙ КОМПОНЕНТ — ВРЕМЯ ОТХОДА КО СНУ. Его здесь не было, и это была
 * дыра, а не упрощение: человек, легший в 4 утра и вставший в 12, спал ровно
 * восемь часов, стабильно, и получал полные баллы за продолжительность, полные
 * за регулярность и совет «держи текущий режим — он работает». Приложение о
 * здоровье хвалило за сбитый режим.
 *
 * Восемь часов сна с 4 до 12 и восемь часов с 23 до 7 — это не одна и та же
 * ночь. Свет, мелатонин и температура тела привязаны к суткам, а не к
 * длительности, и оценка, которая этого не видит, меряет только половину.
 *
 * Баллы под новый блок взяты у продолжительности (−10) и у регулярности (−10).
 * У регулярности — потому что именно она давала полный балл за стабильно
 * плохое расписание: ложиться каждый день в четыре утра «регулярно». У
 * продолжительности — потому что пятьдесят из ста за один параметр делали
 * оценку почти его синонимом.
 */
const MAX_DURATION = 40;
const MAX_TIMING = 20;
const MAX_REGULARITY = 20;
const MAX_QUALITY = 20;

/**
 * До какого времени отход ко сну считается нормальным, в минутах на шкале
 * bedtimeOffset (полночь = 0, вечер отрицательный).
 *
 * Час ночи, а не полночь: приложение не должно штрафовать взрослого человека за
 * обычный поздний вечер. Ноль баллов — на четырёх утра: это уже не «поздно
 * лёг», это перевёрнутые сутки.
 */
const TIMING_IDEAL_LATEST_MIN = 60;
const TIMING_ZERO_AT_MIN = 240;

/**
 * Bedtimes this far apart (in minutes) score zero for regularity. Two hours:
 * a half-hour drift is normal life, two hours is a different schedule.
 */
const REGULARITY_ZERO_AT_MIN = 120;

export interface SleepNorm {
  /** The target this person is actually measured against, in minutes. */
  targetMin: number;
  /** True when targetMin is their own average rather than the 8h default. */
  isPersonal: boolean;
  /** Nights the average was taken over. */
  nights: number;
}

/**
 * What "enough sleep" means for this person.
 *
 * Their own trailing average, once there is enough of it to mean something, and
 * the flat 8h otherwise. Clamped to a sane band so a fortnight of four-hour
 * nights cannot quietly redefine four hours as this user's healthy normal —
 * which is the failure mode of every "personalised" target that trusts the data
 * unconditionally.
 */
export function sleepNorm(logs: SleepLogItem[], today: CalendarDay): SleepNorm {
  const from = addDays(today, -SLEEP_BASELINE_DAYS);
  const recent = logs.filter((log) => log.day > from && log.day <= today && log.durationMin > 0);

  if (recent.length < SLEEP_BASELINE_MIN_NIGHTS) {
    return { targetMin: SLEEP_GOAL_MIN, isPersonal: false, nights: recent.length };
  }

  const average = Math.round(
    recent.reduce((total, log) => total + log.durationMin, 0) / recent.length,
  );

  if (average < NORM_FLOOR_MIN || average > NORM_CEILING_MIN) {
    return { targetMin: SLEEP_GOAL_MIN, isPersonal: false, nights: recent.length };
  }

  return { targetMin: average, isPersonal: true, nights: recent.length };
}

/**
 * Minutes past midnight, on a scale where the evening is negative.
 *
 * 23:30 becomes −30 and 00:30 becomes 30, so the two are an hour apart rather
 * than twenty-three. Without this, every bedtime either side of midnight would
 * read as maximally irregular, which is the single most common bedtime there is.
 */
function bedtimeOffset(bedTime: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(bedTime);
  if (!match) return null;

  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 12 * 60 ? minutes - 24 * 60 : minutes;
}

/** Mean absolute deviation of bedtime, in minutes, or null if too few nights. */
export function bedtimeSpreadMin(logs: SleepLogItem[], today: CalendarDay): number | null {
  const from = addDays(today, -SLEEP_BASELINE_DAYS);
  const offsets = logs
    .filter((log) => log.day > from && log.day <= today)
    .map((log) => bedtimeOffset(log.bedTime))
    .filter((value): value is number => value !== null);

  if (offsets.length < 3) return null;

  const mean = offsets.reduce((total, value) => total + value, 0) / offsets.length;
  const deviation =
    offsets.reduce((total, value) => total + Math.abs(value - mean), 0) / offsets.length;

  return Math.round(deviation);
}

export interface SleepScoreComponent {
  key: "duration" | "timing" | "regularity" | "quality";
  label: string;
  score: number;
  maxScore: number;
  /** One line the UI can show verbatim — why this component scored what it did. */
  note: string;
}

export interface SleepScoreResult {
  /** 0–100, or null when the night has not been logged at all. */
  score: number | null;
  components: SleepScoreComponent[];
  norm: SleepNorm;
  /** Minutes short of the norm. Negative means slept longer than usual. */
  deficitMin: number;
  /** Accumulated shortfall against the norm over the trailing week. */
  weekDeficitMin: number;
}

function durationScore(durationMin: number, targetMin: number): number {
  // Sleeping past the norm is not a failure and is not a bonus: the curve tops
  // out at the target rather than rewarding twelve hours in bed.
  const ratio = Math.min(1, durationMin / targetMin);
  return Math.round(MAX_DURATION * ratio);
}

/**
 * Насколько сон попадает в сутки, а не только в восемь часов.
 *
 * Смотрит на отход ко сну, а не на подъём: подъём — следствие. Человек,
 * ложащийся в 23:00, встанет в норме сам; человек, ложащийся в 4 утра, не
 * встанет рано, даже если очень хочет.
 */
function timingScore(bedTime: string): number {
  const offset = bedtimeOffset(bedTime);
  // Время не распозналось — это не повод штрафовать: не измерено, значит не
  // вычитаем. Та же логика, что и у пустого разброса в регулярности.
  if (offset === null) return MAX_TIMING;

  if (offset <= TIMING_IDEAL_LATEST_MIN) return MAX_TIMING;

  const ratio = Math.max(
    0,
    1 - (offset - TIMING_IDEAL_LATEST_MIN) / (TIMING_ZERO_AT_MIN - TIMING_IDEAL_LATEST_MIN),
  );
  return Math.round(MAX_TIMING * ratio);
}

/** «04:00» как есть — для строки объяснения. */
function isLateBedtime(bedTime: string): boolean {
  const offset = bedtimeOffset(bedTime);
  return offset !== null && offset > TIMING_IDEAL_LATEST_MIN;
}

function regularityScore(spread: number | null): number {
  // No spread yet means not enough nights to judge — score it neutral rather
  // than punishing a new user for data they have not had time to produce.
  if (spread === null) return Math.round(MAX_REGULARITY * 0.6);
  const ratio = Math.max(0, 1 - spread / REGULARITY_ZERO_AT_MIN);
  return Math.round(MAX_REGULARITY * ratio);
}

function qualityScore(quality: number): number {
  // 1–5 stars onto 0–20, where one star is not zero: the person still slept.
  return Math.round(MAX_QUALITY * ((quality - 1) / 4) * 0.8 + MAX_QUALITY * 0.2);
}

function formatHours(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  return mins === 0 ? `${hours} ч` : `${hours} ч ${mins} мин`;
}

/**
 * Score the night keyed to `day`, in the context of everything logged before it.
 *
 * Returns `score: null` rather than zero when the night is not logged: nothing
 * was measured, and a zero would read as "you slept terribly" on a screen the
 * user simply has not filled in yet.
 */
export function sleepScore(
  logs: SleepLogItem[],
  day: CalendarDay,
  today: CalendarDay,
): SleepScoreResult {
  const norm = sleepNorm(logs, today);
  const log = logOnDay(logs, day);
  const spread = bedtimeSpreadMin(logs, today);

  const weekFrom = addDays(today, -7);
  const weekDeficitMin = logs
    .filter((item) => item.day > weekFrom && item.day <= today)
    .reduce((total, item) => total + Math.max(0, norm.targetMin - item.durationMin), 0);

  if (!log) {
    return { score: null, components: [], norm, deficitMin: 0, weekDeficitMin };
  }

  const deficitMin = norm.targetMin - log.durationMin;

  const components: SleepScoreComponent[] = [
    {
      key: "duration",
      label: "Продолжительность",
      score: durationScore(log.durationMin, norm.targetMin),
      maxScore: MAX_DURATION,
      note:
        deficitMin > 0
          ? `На ${formatHours(deficitMin)} меньше ${norm.isPersonal ? "твоей нормы" : "цели"} в ${formatHours(norm.targetMin)}`
          : `${formatHours(log.durationMin)} — ${norm.isPersonal ? "твоя норма" : "цель"} закрыта`,
    },
    {
      key: "timing",
      label: "Время отбоя",
      score: timingScore(log.bedTime),
      maxScore: MAX_TIMING,
      note: isLateBedtime(log.bedTime)
        ? `Отбой в ${log.bedTime} — организм считает это ночной сменой, сколько бы часов сна ни вышло`
        : `Отбой в ${log.bedTime} — сон попадает в естественные часы`,
    },
    {
      key: "regularity",
      label: "Регулярность",
      score: regularityScore(spread),
      maxScore: MAX_REGULARITY,
      note:
        spread === null
          ? "Пока мало ночей, чтобы судить о режиме"
          : spread <= 30
            ? `Ложишься примерно в одно время — разброс ${spread} мин`
            : `Время отхода ко сну гуляет на ${formatHours(spread)}`,
    },
    {
      key: "quality",
      label: "Качество",
      score: qualityScore(log.quality),
      maxScore: MAX_QUALITY,
      note: `Ты оценил ночь на ${log.quality} из 5`,
    },
  ];

  return {
    score: components.reduce((total, item) => total + item.score, 0),
    components,
    norm,
    deficitMin,
    weekDeficitMin,
  };
}

/**
 * The one-line verdict shown next to the number.
 *
 * ПРИНИМАЕТ ВЕСЬ РЕЗУЛЬТАТ, А НЕ ОДНО ЧИСЛО, И ЭТО НУЖНО РОВНО ДЛЯ ОДНОГО
 * СЛУЧАЯ. Восемь часов сна с 4 утра до 12 дают полный балл за
 * продолжительность, полный за стабильность и ноль за время отбоя — в сумме
 * около 76, то есть «хорошо восстановился» рядом со строкой «время отбоя
 * 0 из 20». Вердикт, противоречащий собственному разбору строкой ниже, хуже
 * отсутствующего вердикта: человек читает верхнюю строку и не читает нижнюю.
 *
 * Поэтому сбитые сутки опускают формулировку независимо от суммы. Само число
 * при этом не трогается — оно честно сложено из компонентов, и подгонять его
 * под подпись значило бы врать второй раз.
 */
export function sleepScoreLabel(result: SleepScoreResult): string {
  const { score } = result;
  if (score === null) return "Ночь не записана";

  const timing = result.components.find((component) => component.key === "timing");
  const timingBroken = timing !== undefined && timing.score <= timing.maxScore * 0.25;

  if (timingBroken) return score >= 70 ? "Выспался, но не в те часы" : "Режим сбит";

  if (score >= 85) return "Отличная ночь";
  if (score >= 70) return "Хорошо восстановился";
  if (score >= 50) return "Так себе ночь";
  return "Восстановление просело";
}

/**
 * What to change tonight, derived from the same components the score is made
 * of — so the advice can never contradict the number above it.
 *
 * Deliberately one sentence and one lever. A list of four sleep-hygiene tips is
 * the thing the Coach's prompt forbids by name, and it would be no better here.
 */
export function sleepTonightAdvice(
  result: SleepScoreResult,
  lastBedtime: string | null,
): string | null {
  if (result.score === null) return null;

  const weakest = [...result.components].sort(
    (a, b) => a.score / a.maxScore - b.score / b.maxScore,
  )[0];

  if (!weakest) return null;

  /**
   * ВРЕМЯ ОТБОЯ ПРОВЕРЯЕТСЯ ПЕРВЫМ И ОТДЕЛЬНО ОТ «САМОГО СЛАБОГО».
   *
   * Здесь была настоящая ошибка совета, а не только оценки. У человека,
   * ложащегося в 4 утра и спящего восемь часов, продолжительность закрыта,
   * режим стабилен — и функция доходила до последней строки и отвечала «держи
   * текущий режим — он работает». Приложение о здоровье советовало продолжать
   * ложиться под утро.
   *
   * Сдвиг режима — единственный совет, который нельзя вывести из «самого
   * слабого компонента»: сбитые сутки могут соседствовать с отличными баллами
   * за всё остальное, и именно так они обычно и выглядят.
   */
  const timing = result.components.find((component) => component.key === "timing");
  if (timing && timing.score <= timing.maxScore * 0.5) {
    return "Отбой сильно за полночь. Сдвигай его на 20–30 минут раньше каждые пару дней — резкий перенос не приживается, а восемь часов под утро не заменяют восьми часов ночью.";
  }

  if (weakest.key === "duration" && result.deficitMin > 0 && lastBedtime) {
    const earlier = Math.min(90, Math.max(15, Math.round(result.deficitMin / 15) * 15));
    return `Лечь на ${earlier} мин раньше обычного — это закроет большую часть недосыпа, не трогая утро.`;
  }

  if (weakest.key === "regularity") {
    return "Сегодня лечь в то же время, что и вчера. Ровный режим поднимает оценку сильнее, чем один длинный сон.";
  }

  if (result.weekDeficitMin >= 180) {
    return `За неделю накопилось ${formatHours(result.weekDeficitMin)} недосыпа. Одна ранняя ночь вернёт часть.`;
  }

  return "Держи текущий режим — он работает.";
}
