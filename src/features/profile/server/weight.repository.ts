import "server-only";
import { db } from "@/server/db";
import { dateToDay, dayToDate, type CalendarDay } from "@/shared/lib/calendar-day";

/**
 * Вес: история и текущее значение.
 *
 * ДВА ПОЛЯ, ОДНА ФУНКЦИЯ ЗАПИСИ. WeightLog — история, Profile.weightKg —
 * актуальное значение, которое читают формула калорий, wellness-блок NOVA Score,
 * промпт коуча, профиль и отчёты. Перевести все эти места на «последнюю строку
 * WeightLog» означало бы переписать работающий код ради нормализации, поэтому
 * актуальное значение остаётся там, где было, а согласованность держится
 * единственным правилом: писать вес можно только через logWeight(), и она пишет
 * оба поля в одной транзакции.
 *
 * Profile.weightKg — Int, а WeightLog.weightKg — Float. Это не рассинхронизация:
 * колонка профиля целочисленная с самого онбординга, и история хранит точное
 * значение, а профиль — округлённое до килограмма. Округление здесь, в одном
 * месте, вместо шести округлений на чтении.
 */

export interface WeightPoint {
  day: CalendarDay;
  weightKg: number;
}

/**
 * Записать вес за день.
 *
 * Upsert по (userId, day): второе взвешивание в тот же день — уточнение первого,
 * а не новый факт, ровно как у воды в NutritionWaterLog.
 *
 * Профиль обновляется только когда запись относится к последнему известному дню
 * или новее. Иначе задним числом внесённый вес за прошлый вторник переписал бы
 * «текущий вес» на устаревший, и норма калорий поехала бы вслед за ним.
 */
export async function logWeight(
  userId: string,
  day: CalendarDay,
  weightKg: number,
): Promise<void> {
  const date = dayToDate(day);

  const latest = await db.weightLog.findFirst({
    where: { userId },
    orderBy: { day: "desc" },
    select: { day: true },
  });

  const isCurrent = latest === null || date.getTime() >= latest.day.getTime();

  await db.$transaction([
    db.weightLog.upsert({
      where: { userId_day: { userId, day: date } },
      create: { userId, day: date, weightKg },
      update: { weightKg },
    }),
    ...(isCurrent
      ? [
          db.profile.updateMany({
            where: { userId },
            data: { weightKg: Math.round(weightKg) },
          }),
        ]
      : []),
  ]);
}

/** История веса, от старых к новым. */
export async function listWeights(
  userId: string,
  from?: CalendarDay,
): Promise<WeightPoint[]> {
  const logs = await db.weightLog.findMany({
    where: { userId, ...(from ? { day: { gte: dayToDate(from) } } : {}) },
    orderBy: { day: "asc" },
    select: { day: true, weightKg: true },
  });

  return logs.map((log) => ({ day: dateToDay(log.day), weightKg: log.weightKg }));
}

/**
 * Самый ранний записанный вес — точка отсчёта карточки «Тело».
 *
 * Null, когда записей нет вовсе или когда она одна: «изменение» при единственном
 * замере — это ноль, выданный за факт, а карточка в таком случае обязана
 * молчать, а не писать «−0 кг».
 */
export async function getStartWeight(userId: string): Promise<number | null> {
  const [first, count] = await Promise.all([
    db.weightLog.findFirst({
      where: { userId },
      orderBy: { day: "asc" },
      select: { weightKg: true },
    }),
    db.weightLog.count({ where: { userId } }),
  ]);

  return count > 1 && first ? first.weightKg : null;
}
