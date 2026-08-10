import "server-only";
import { db } from "@/server/db";

/**
 * Прогресс Академии: какие уроки человек закрыл.
 *
 * Отсутствие строки и есть «не пройден», поэтому снятие отметки удаляет строку —
 * то же правило, что у HabitLog: таблица из почти одних `false` была бы той же
 * информацией в несколько раз большем объёме.
 *
 * Уроки не проверяются на существование при записи. Урок, удалённый из
 * content/lessons.ts, оставит строку-сироту, и это осознанно: читатель её просто
 * не находит и игнорирует, вместо того чтобы падать на неизвестном id.
 */

export async function listCompletedLessonIds(userId: string): Promise<string[]> {
  const rows = await db.academyProgress.findMany({
    where: { userId },
    select: { lessonId: true },
  });

  return rows.map((row) => row.lessonId);
}

/**
 * Отметить или снять отметку.
 *
 * upsert, а не create: повторное нажатие на уже пройденный урок не должно падать
 * по уникальному индексу — это идемпотентная операция, ровно как отметка привычки.
 */
export async function setLessonCompleted(
  userId: string,
  lessonId: string,
  isCompleted: boolean,
): Promise<void> {
  if (isCompleted) {
    await db.academyProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    });
    return;
  }

  await db.academyProgress.deleteMany({ where: { userId, lessonId } });
}
