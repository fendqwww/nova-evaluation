import type { ProfileOverview } from "@/features/profile/types";

/**
 * Achievements, derived — never stored.
 *
 * This is the whole design decision. There is no Achievement table, no
 * unlocked_at column and no job that awards anything: every badge below is a
 * threshold read against a count the app already keeps, evaluated at render
 * time. That means:
 *
 *   - Nothing can be out of sync. A badge cannot claim 30 workouts for an
 *     account that has 12, which is exactly what a stored unlock does the first
 *     time history is edited or cleared.
 *   - Adding a badge is one entry in this array, with no migration and no
 *     backfill for existing users — they simply have it, because they always
 *     did.
 *   - Un-ticking a day can take a badge back. That is a deliberate and honest
 *     consequence of counting what is true rather than what once happened; the
 *     alternative is a trophy case that lies.
 *
 * When achievements need to *notify* ("вы только что получили…"), that will
 * need a stored last-seen set — and that is the point at which a table earns
 * its place, not before.
 */
export type AchievementTone = "goal" | "habit" | "task" | "score" | "ai" | "accent";

export interface AchievementDef {
  id: string;
  title: string;
  /** What it takes, in the user's words. */
  description: string;
  tone: AchievementTone;
  /** Lucide icon name, resolved by the card — keeps this file data-only. */
  icon:
    | "target"
    | "flame"
    | "dumbbell"
    | "check"
    | "utensils"
    | "sparkles"
    | "trophy"
    | "camera"
    | "repeat";
  /** How far along, and what "done" is. Progress is clamped by the reader. */
  value: (overview: ProfileOverview) => number;
  goal: number;
}

export interface AchievementProgress {
  def: AchievementDef;
  value: number;
  goal: number;
  isUnlocked: boolean;
  /** 0–1, clamped. What the bar under a locked badge fills to. */
  ratio: number;
}

/**
 * The catalogue.
 *
 * Ordered from "you will get this on day one" to "this takes months", because
 * the list doubles as a description of what the app expects of you. Every
 * threshold is reachable by ordinary use — none of them requires a streak that
 * would only be achievable by someone gaming the counter.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-goal",
    title: "Первая цель",
    description: "Поставить цель в Nova",
    tone: "goal",
    icon: "target",
    value: (overview) => overview.counts.goalsActive + overview.totals.goalsCompleted,
    goal: 1,
  },
  {
    id: "first-care",
    title: "Первая процедура",
    description: "Выполнить процедуру ухода",
    tone: "accent",
    icon: "sparkles",
    value: (overview) => overview.totals.careDone,
    goal: 1,
  },
  {
    id: "streak-7",
    title: "Неделя в строю",
    description: "7 дней подряд с активностью",
    tone: "habit",
    icon: "flame",
    value: (overview) => overview.streak.best,
    goal: 7,
  },
  {
    id: "habits-50",
    title: "Полсотни отметок",
    description: "50 выполненных привычек",
    tone: "habit",
    icon: "repeat",
    value: (overview) => overview.totals.habitTicks,
    goal: 50,
  },
  {
    id: "tasks-100",
    title: "Сотня задач",
    description: "100 выполненных задач",
    tone: "task",
    icon: "check",
    value: (overview) => overview.totals.tasksCompleted,
    goal: 100,
  },
  {
    id: "workouts-30",
    title: "30 тренировок",
    description: "Провести 30 тренировок",
    tone: "score",
    icon: "dumbbell",
    value: (overview) => overview.totals.workouts,
    goal: 30,
  },
  {
    id: "nutrition-50",
    title: "50 дней питания",
    description: "Вести дневник питания 50 дней",
    tone: "score",
    icon: "utensils",
    value: (overview) => overview.totals.nutritionDays,
    goal: 50,
  },
  {
    id: "photos-10",
    title: "Хроника",
    description: "10 фото прогресса",
    tone: "accent",
    icon: "camera",
    value: (overview) => overview.totals.photos,
    goal: 10,
  },
  {
    id: "streak-30",
    title: "Месяц без пропусков",
    description: "30 дней подряд с активностью",
    tone: "ai",
    icon: "trophy",
    value: (overview) => overview.streak.best,
    goal: 30,
  },
];

/**
 * Every achievement with its current standing, unlocked ones first.
 *
 * Unlocked-first rather than strict catalogue order: the section is a trophy
 * case before it is a to-do list, and a user who has earned four badges should
 * see four badges rather than scroll past five locked ones to find them.
 * Within each group the catalogue order is preserved, so the list never
 * reshuffles for a reason the user cannot see.
 */
export function evaluateAchievements(overview: ProfileOverview): AchievementProgress[] {
  const evaluated = ACHIEVEMENTS.map((def) => {
    const value = def.value(overview);
    return {
      def,
      value,
      goal: def.goal,
      isUnlocked: value >= def.goal,
      ratio: def.goal === 0 ? 1 : Math.min(1, value / def.goal),
    };
  });

  return [
    ...evaluated.filter((item) => item.isUnlocked),
    ...evaluated.filter((item) => !item.isUnlocked),
  ];
}

/** How many are earned — the "4 из 9" line over the grid. */
export function unlockedCount(items: AchievementProgress[]): number {
  return items.filter((item) => item.isUnlocked).length;
}
