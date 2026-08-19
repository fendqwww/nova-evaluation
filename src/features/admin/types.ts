/**
 * Сводка по продукту. Только агрегаты по всей базе — ни имён, ни telegramId,
 * ни чьих-либо записей. Это не техническое ограничение, а граница: панель
 * отвечает на вопрос «как идут дела», и для ответа не нужно знать, кто сегодня
 * записал завтрак.
 */
export interface AdminStats {
  generatedAt: string;
  users: {
    total: number;
    onboarded: number;
    /** Открыли приложение и бросили на знакомстве. Самое дорогое число здесь. */
    droppedInOnboarding: number;
    newDay: number;
    newWeek: number;
    newMonth: number;
    activeDay: number;
    activeWeek: number;
    activeMonth: number;
  };
  plans: { free: number; plus: number; max: number };
  bot: { started: number; blocked: number; unsubscribed: number };
  content: {
    goals: number;
    habits: number;
    habitLogs: number;
    tasks: number;
    workouts: number;
    workoutSessions: number;
    nutritionEntries: number;
    sleepLogs: number;
    appearanceRoutines: number;
    appearancePhotos: number;
    coachMessages: number;
    weightLogs: number;
    academyProgress: number;
    paths: number;
  };
  ai: {
    /** "YYYY-MM" — месяц, за который считался расход. */
    periodMonth: string;
    foodAnalyses: number;
    appearanceAnalyses: number;
    coachMessages: number;
  };
  support: { total: number; open: number };
}
