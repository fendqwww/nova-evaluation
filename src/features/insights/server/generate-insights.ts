import type { PrimaryGoalValue } from "@/features/onboarding/schemas";
import type { Insight, InsightContext } from "@/features/insights/types";

const focusCopy: Record<PrimaryGoalValue, { activity: string; tip: string }> = {
  productivity: {
    activity: "задачи",
    tip: "Начните день с одной приоритетной задачи — это задаёт темп остальным.",
  },
  health: {
    activity: "привычки",
    tip: "Небольшая привычка, которую легко повторить сегодня, важнее амбициозного плана.",
  },
  mindfulness: {
    activity: "заметки",
    tip: "Запишите одну мысль о своём состоянии — этого достаточно для осознанности.",
  },
  finance: {
    activity: "цели",
    tip: "Разбейте финансовую цель на один конкретный шаг на этой неделе.",
  },
  all_in_one: {
    activity: "цели",
    tip: "Выберите одну сферу жизни, на которой сосредоточитесь именно сегодня.",
  },
};

/**
 * Rule-based v1. `generateInsights` is the only integration point a future
 * Claude API call needs to replace — the return shape (Insight[]) is final,
 * so neither the dashboard card nor the AI Coach modal will need to change.
 */
function buildCandidates(ctx: InsightContext): Insight[] {
  const copy = focusCopy[ctx.primaryFocus];
  const totalItems = ctx.goalsCount + ctx.habitsCount + ctx.tasksCount;
  const candidates: Insight[] = [];

  if (totalItems === 0) {
    candidates.push({
      id: "get-started",
      title: "Сделайте первый шаг",
      body: `${ctx.firstName}, добавьте свою первую цель, привычку или задачу — Nova начнёт давать более точные советы.`,
    });
  }

  if (ctx.goalsCount === 0) {
    candidates.push({
      id: "set-a-goal",
      title: "Определите цель",
      body: "Без ориентира сложно оценивать прогресс. Сформулируйте одну конкретную цель — этого достаточно для начала.",
    });
  }

  if (ctx.habitsCount === 0) {
    candidates.push({
      id: "add-habit",
      title: "Добавьте привычку",
      body: copy.tip,
    });
  }

  if (ctx.tasksCount === 0 && ctx.goalsCount > 0) {
    candidates.push({
      id: "break-down-goal",
      title: "Разбейте цель на шаги",
      body: "Добавьте задачу на сегодня, которая приближает вас к цели — маленький шаг лучше отсутствия движения.",
    });
  }

  if (ctx.lifeScore >= 70) {
    candidates.push({
      id: "strong-momentum",
      title: "Отличный темп",
      body: "Ваш Индекс жизни выше среднего — вы последовательно работаете над собой. Продолжайте в том же духе.",
    });
  }

  candidates.push({
    id: "focus-area-tip",
    title: `Фокус на ${copy.activity}`,
    body: copy.tip,
  });

  candidates.push({
    id: "general-encouragement",
    title: "Маленькие шаги работают",
    body: `${ctx.firstName}, регулярность важнее интенсивности. Один маленький шаг сегодня — уже прогресс.`,
  });

  candidates.push({
    id: "reflect",
    title: "Возвращайтесь каждый день",
    body: "Так вы быстрее увидите, что работает, а что нет — Nova учитывает эту динамику.",
  });

  return candidates;
}

export function generateInsights(
  context: InsightContext,
  options: { limit?: number } = {},
): Insight[] {
  const limit = options.limit ?? 1;
  return buildCandidates(context).slice(0, limit);
}
