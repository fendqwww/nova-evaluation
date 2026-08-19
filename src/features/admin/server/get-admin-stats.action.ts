"use server";

import { db } from "@/server/db";
import { requireAdmin } from "@/features/admin/server/admin-guard";
import type { AdminStats } from "@/features/admin/types";

/**
 * Сводка по продукту одним запросом.
 *
 * Было HTTP-маршрутом за общим секретом (/api/admin/stats) под отдельной
 * страницей в браузере. Стало серверным действием: панель переехала внутрь
 * Mini App, где личность приходит подписанной Telegram, и проверять её надёжнее,
 * чем пароль (разбор — в admin-guard.ts).
 *
 * Промежуточного слоя-репозитория здесь нет намеренно: это два десятка count()
 * без единого условия по пользователю, то есть ровно один запрос ровно одного
 * экрана. Репозиторий вокруг него был бы файлом, пересказывающим Prisma.
 */

/** Пороги «новизны» и «активности» в днях. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** "YYYY-MM" в UTC — достаточно точно для сводки, которую читают глазами. */
function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getAdminStats(
  rawInitData: string | undefined,
): Promise<AdminStats> {
  requireAdmin(rawInitData);

  const day = daysAgo(1);
  const week = daysAgo(7);
  const month = daysAgo(30);
  const periodMonth = currentPeriodMonth();

  // Один Promise.all, а не серия ожиданий: два десятка count() по очереди —
  // это два десятка последовательных обходов до базы, и на Neon из Европы
  // разница между «параллельно» и «по очереди» измеряется секундами.
  const [
    usersTotal,
    usersOnboarded,
    usersNewDay,
    usersNewWeek,
    usersNewMonth,
    activeDay,
    activeWeek,
    activeMonth,
    botStarted,
    botBlocked,
    botUnsubscribed,
    planRows,
    goals,
    habits,
    habitLogs,
    tasks,
    workouts,
    workoutSessions,
    nutritionEntries,
    sleepLogs,
    appearanceRoutines,
    appearancePhotos,
    coachMessages,
    weightLogs,
    academyProgress,
    paths,
    usage,
    ticketsTotal,
    ticketsOpen,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { onboardingCompletedAt: { not: null } } }),
    db.user.count({ where: { createdAt: { gte: day } } }),
    db.user.count({ where: { createdAt: { gte: week } } }),
    db.user.count({ where: { createdAt: { gte: month } } }),
    db.botSubscriber.count({ where: { lastSeenAt: { gte: day } } }),
    db.botSubscriber.count({ where: { lastSeenAt: { gte: week } } }),
    db.botSubscriber.count({ where: { lastSeenAt: { gte: month } } }),
    db.botSubscriber.count({ where: { started: true } }),
    db.botSubscriber.count({ where: { blocked: true } }),
    db.botSubscriber.count({ where: { unsubscribed: true } }),
    db.userSettings.groupBy({ by: ["plan"], _count: { plan: true } }),
    db.goal.count(),
    db.habit.count(),
    db.habitLog.count(),
    db.task.count(),
    db.workout.count(),
    db.workoutSession.count(),
    db.nutritionEntry.count(),
    db.sleepLog.count(),
    db.appearanceRoutine.count(),
    db.appearancePhoto.count(),
    db.coachMessage.count(),
    db.weightLog.count(),
    db.academyProgress.count(),
    db.novaPath.count(),
    db.userUsage.aggregate({
      where: { periodMonth },
      _sum: {
        foodAnalysesUsed: true,
        appearanceAnalysesUsed: true,
        coachMessagesUsed: true,
      },
    }),
    db.supportTicket.count(),
    db.supportTicket.count({ where: { status: { not: "CLOSED" } } }),
  ]);

  // groupBy возвращает только те тарифы, которые кому-то проставлены. Нули для
  // остальных дописываются здесь: иначе «никто не купил MAX» показывалось бы
  // прочерком вместо честного нуля.
  const plans = { free: 0, plus: 0, max: 0 };
  for (const row of planRows) {
    if (row.plan === "free" || row.plan === "plus" || row.plan === "max") {
      plans[row.plan] = row._count.plan;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    users: {
      total: usersTotal,
      onboarded: usersOnboarded,
      droppedInOnboarding: usersTotal - usersOnboarded,
      newDay: usersNewDay,
      newWeek: usersNewWeek,
      newMonth: usersNewMonth,
      activeDay,
      activeWeek,
      activeMonth,
    },
    plans,
    bot: { started: botStarted, blocked: botBlocked, unsubscribed: botUnsubscribed },
    content: {
      goals,
      habits,
      habitLogs,
      tasks,
      workouts,
      workoutSessions,
      nutritionEntries,
      sleepLogs,
      appearanceRoutines,
      appearancePhotos,
      coachMessages,
      weightLogs,
      academyProgress,
      paths,
    },
    ai: {
      periodMonth,
      foodAnalyses: usage._sum.foodAnalysesUsed ?? 0,
      appearanceAnalyses: usage._sum.appearanceAnalysesUsed ?? 0,
      coachMessages: usage._sum.coachMessagesUsed ?? 0,
    },
    support: { total: ticketsTotal, open: ticketsOpen },
  };
}
