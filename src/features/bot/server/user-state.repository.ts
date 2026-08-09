import "server-only";
import { db } from "@/server/db";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { dayInZone, diffDays, hourIn, type CalendarDay } from "@/shared/lib/calendar-day";
import type { NotificationKind } from "../constants";

/**
 * Всё, что нужно знать о человеке, чтобы решить, писать ему и что именно.
 *
 * Состояние собирается из buildCoachAnalysis, а не считается заново. Первая
 * версия этого файла честно ходила в базу за привычками, сном и задачами — и
 * ошиблась почти в каждом поле: у Habit нет колонки со статусом расписания
 * (есть frequency + weekdayMask + timesPerWeek), серия нигде не хранится, а
 * вычисляется, HabitLog ключуется по `date`, а не по `day`. Всё это уже
 * посчитано в анализе коуча, причём посчитано так же, как на главном экране, —
 * а значит, цифра в сообщении бота совпадёт с цифрой, которую человек увидит,
 * открыв приложение. Второй, «дешёвый» способ посчитать серию — это второй
 * ответ на тот же вопрос.
 */

export interface BotUserState {
  userId: string;
  chatId: string;
  firstName: string;
  timezone: string;
  today: CalendarDay;
  /** Час в часовом поясе пользователя, 0–23. */
  localHour: number;

  /** Сколько дней не открывал приложение. null — не заходил ни разу. */
  daysSinceLastSeen: number | null;

  /* --- что уже сделано сегодня --- */
  loggedNutritionToday: boolean;
  habitsDueToday: number;
  habitsDoneToday: number;
  tasksOverdue: number;

  /* --- на что опираются тексты --- */
  /** Самая длинная живая серия по привычкам, в днях. */
  bestStreak: number;
  /** Часы сна за прошлую ночь, если записаны. */
  sleepHoursLastNight: number | null;

  /* --- выбор пользователя в настройках --- */
  notifyNutrition: boolean;
  notifyHabits: boolean;
  notifyTasks: boolean;
}

/**
 * Кого планировщик вообще рассматривает.
 *
 * Отсев — в SQL, а не в цикле: отписавшиеся и заблокировавшие бота не должны
 * даже читаться. Разница между «прочитать сто строк» и «прочитать все».
 */
export async function listNotifiableUsers(limit = 500): Promise<BotUserState[]> {
  const subscribers = await db.botSubscriber.findMany({
    where: { started: true, unsubscribed: false, blocked: false },
    select: { userId: true, chatId: true, lastSeenAt: true },
    take: limit,
  });

  const states = await Promise.all(
    subscribers.map((row) => buildState(row.userId, row.chatId, row.lastSeenAt)),
  );

  return states.filter((state): state is BotUserState => state !== null);
}

/**
 * Состояние одного человека.
 *
 * Используется и планировщиком, и командами бота (/today, /streak): один
 * способ получить состояние вместо двух, которые разойдутся.
 */
export async function buildState(
  userId: string,
  chatId: string,
  lastSeenAt: Date | null,
): Promise<BotUserState | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      profile: { select: { timezone: true } },
      settings: {
        select: { notifyNutrition: true, notifyHabits: true, notifyTasks: true },
      },
    },
  });

  // Нет профиля — человек не прошёл онбординг. Ему нечего показывать, и
  // «сегодня по расписанию 0 привычек» было бы честным, но бессмысленным
  // сообщением.
  if (!user?.profile) return null;

  const timezone = user.profile.timezone;
  const analysis = await buildCoachAnalysis(userId, timezone);

  return {
    userId,
    chatId,
    firstName: user.firstName,
    timezone,
    today: analysis.today,
    localHour: hourIn(timezone),
    daysSinceLastSeen:
      lastSeenAt === null ? null : diffDays(dayInZone(lastSeenAt, timezone), analysis.today),
    loggedNutritionToday: analysis.nutrition.isLoggedToday,
    habitsDueToday: analysis.metrics.habitsDue,
    habitsDoneToday: analysis.metrics.habitsDone,
    tasksOverdue: analysis.metrics.tasksOverdue,
    // Серии считаются в днях и в неделях в зависимости от расписания привычки;
    // в сообщении уместна только дневная — «серия 3 недели» рядом с «отметьте
    // сегодня» читается странно.
    bestStreak: analysis.habits
      .filter((habit) => habit.streakUnit === "day")
      .reduce((best, habit) => Math.max(best, habit.currentStreak), 0),
    sleepHoursLastNight:
      analysis.sleep.lastNightMin === null
        ? null
        : Math.round((analysis.sleep.lastNightMin / 60) * 10) / 10,
    notifyNutrition: user.settings?.notifyNutrition ?? false,
    notifyHabits: user.settings?.notifyHabits ?? true,
    notifyTasks: user.settings?.notifyTasks ?? true,
  };
}

/** Состояние по Telegram id — для команд бота. */
export async function buildStateForTelegramId(
  telegramId: string,
): Promise<BotUserState | null> {
  const user = await db.user.findUnique({
    where: { telegramId },
    select: { id: true, botSubscriber: { select: { chatId: true, lastSeenAt: true } } },
  });
  if (!user) return null;

  return buildState(
    user.id,
    user.botSubscriber?.chatId ?? telegramId,
    user.botSubscriber?.lastSeenAt ?? null,
  );
}

/* ------------------------------------------------------- доставки --- */

/** Что бот уже отправил сегодня. Набор видов, а не число. */
export async function deliveredToday(
  userId: string,
  day: CalendarDay,
): Promise<Set<NotificationKind>> {
  const rows = await db.botDelivery.findMany({
    where: { userId, day },
    select: { kind: true },
  });
  return new Set(rows.map((row) => row.kind as NotificationKind));
}

/** Когда последний раз отправляли сообщение этого вида. */
export async function lastDeliveryOf(
  userId: string,
  kind: NotificationKind,
): Promise<Date | null> {
  const row = await db.botDelivery.findFirst({
    where: { userId, kind },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });
  return row?.sentAt ?? null;
}

/**
 * Занять право на отправку — атомарно.
 *
 * Тот же приём, что и с лимитами AI: вставка строки с уникальным ключом
 * (userId, kind, day) *до* отправки. Два одновременных запуска планировщика
 * (Vercel Cron не гарантирует ровно один вызов, а ручной вызов возможен
 * всегда) оба попробуют вставить — второй получит отказ по constraint и не
 * отправит ничего.
 *
 * Отдельная проверка «не отправляли ли уже» тут не помогла бы: между чтением и
 * отправкой помещается второй запуск целиком.
 */
export async function claimDelivery(
  userId: string,
  kind: NotificationKind,
  day: CalendarDay,
): Promise<boolean> {
  try {
    await db.botDelivery.create({ data: { userId, kind, day } });
    return true;
  } catch {
    // Единственная ожидаемая причина — уникальный ключ: место уже занято.
    return false;
  }
}

/** Освободить занятое место, если отправить так и не удалось. */
export async function releaseDelivery(
  userId: string,
  kind: NotificationKind,
  day: CalendarDay,
): Promise<void> {
  await db.botDelivery.deleteMany({ where: { userId, kind, day } });
}
