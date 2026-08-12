import type { AcademyTarget } from "@/features/academy/content/lessons";

/**
 * Куда ведёт действие урока.
 *
 * Жило внутри lesson-reader-modal, пока читатель был единственным местом, где
 * урок предлагает что-то сделать. Теперь то же действие показывает карточка
 * «Сегодня» на экране академии, и две копии этой таблицы означали бы, что один
 * и тот же урок может однажды повести в разные разделы.
 */
export const TARGET_HREF: Record<AcademyTarget, string> = {
  nutrition: "/nutrition",
  workouts: "/workouts",
  sleep: "/sleep",
  habits: "/habits",
  profile: "/profile",
  path: "/path",
  coach: "/coach",
};
