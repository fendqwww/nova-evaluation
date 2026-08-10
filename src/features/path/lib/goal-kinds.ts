/**
 * Семь целей, с которых начинается NOVA Path.
 *
 * ПОЧЕМУ СПИСОК, А НЕ СВОБОДНОЕ ПОЛЕ. Человек, который не знает, что делать, не
 * знает и как назвать то, чего хочет. Пустое поле «опиши свою цель» — это тест,
 * который он проваливает первым же экраном. Семь названных целей отвечают на
 * вопрос за него, а свободное уточнение («хочу к лету влезть в костюм») живёт
 * рядом и необязательно — см. PathWizardModal.
 *
 * ПОЧЕМУ ИМЕННО ЭТИ СЕМЬ. Каждая обязана быть целью, по которой продукт может
 * что-то измерить своими данными: вес и КБЖУ, тренировочные сессии, сон,
 * привычки. Восьмой цели «стать счастливее» здесь нет ровно потому, что Nova не
 * умеет измерить счастье и любой путь к нему был бы декорацией.
 *
 * `measure` — единица, в которой у цели есть числовой результат. Только у двух:
 * вес растёт и падает в килограммах, а «наладить питание» не имеет величины, и
 * подставлять ей проценты было бы выдумкой. Прогресс неизмеримых целей считается
 * по закрытым шагам, что и есть их честная мера.
 */

import {
  Brain,
  Briefcase,
  Dumbbell,
  Flame,
  Moon,
  PersonStanding,
  Salad,
  type LucideIcon,
} from "lucide-react";

export const PATH_GOAL_KINDS = [
  "lose_weight",
  "gain_muscle",
  "get_fit",
  "nutrition",
  "sleep",
  "productivity",
  "growth",
] as const;

export type PathGoalKind = (typeof PATH_GOAL_KINDS)[number];

/** Тон карточки цели — из словаря IconChip, а не новый набор цветов. */
export type PathTone = "goal" | "habit" | "task" | "score" | "ai" | "accent" | "neutral";

export interface PathGoalKindMeta {
  kind: PathGoalKind;
  label: string;
  /** Одна строка о том, что человек получит. Читается под названием цели. */
  tagline: string;
  icon: LucideIcon;
  tone: PathTone;
  /** Срок плана по умолчанию. Разный, потому что цели живут в разном времени. */
  horizonDays: number;
  /**
   * Единица измеримого результата, либо null. Когда она есть, визард спрашивает
   * целевое значение и прогресс считается по нему.
   */
  measure: { unit: "kg"; label: string; direction: "down" | "up" } | null;
}

export const PATH_GOAL_KIND_META: Record<PathGoalKind, PathGoalKindMeta> = {
  lose_weight: {
    kind: "lose_weight",
    label: "Похудеть",
    tagline: "Дефицит калорий, белок и движение — без голодания",
    icon: Flame,
    tone: "habit",
    // Девяносто дней — срок, за которым видно изменение состава тела, а не
    // колебание воды. Меньше — и человек судит план по весам за вторник.
    horizonDays: 90,
    measure: { unit: "kg", label: "Целевой вес", direction: "down" },
  },
  gain_muscle: {
    kind: "gain_muscle",
    label: "Набрать мышцы",
    tagline: "Профицит, прогрессия нагрузки и сон как условие роста",
    icon: Dumbbell,
    tone: "task",
    horizonDays: 120,
    measure: { unit: "kg", label: "Целевой вес", direction: "up" },
  },
  get_fit: {
    kind: "get_fit",
    label: "Улучшить форму",
    tagline: "Три тренировки в неделю, которые реально повторяются",
    icon: PersonStanding,
    tone: "score",
    horizonDays: 60,
    measure: null,
  },
  nutrition: {
    kind: "nutrition",
    label: "Наладить питание",
    tagline: "Норма КБЖУ, белок каждый день и дневник без пропусков",
    icon: Salad,
    tone: "score",
    horizonDays: 45,
    measure: null,
  },
  sleep: {
    kind: "sleep",
    label: "Улучшить сон",
    tagline: "Стабильный отбой и норма, из которой берётся энергия дня",
    icon: Moon,
    tone: "goal",
    horizonDays: 45,
    measure: null,
  },
  productivity: {
    kind: "productivity",
    label: "Стать продуктивнее",
    tagline: "Ранний подъём, утренний фокус и задачи, которые закрываются",
    icon: Brain,
    tone: "ai",
    horizonDays: 60,
    measure: null,
  },
  growth: {
    kind: "growth",
    label: "Развитие",
    tagline: "Регулярное обучение и привычки, которые двигают карьеру",
    icon: Briefcase,
    tone: "accent",
    horizonDays: 90,
    measure: null,
  },
};

export const PATH_GOAL_KIND_LIST: PathGoalKindMeta[] = PATH_GOAL_KINDS.map(
  (kind) => PATH_GOAL_KIND_META[kind],
);

export function isPathGoalKind(value: string): value is PathGoalKind {
  return (PATH_GOAL_KINDS as readonly string[]).includes(value);
}

/**
 * Разделы, в которых выполняются шаги пути, и куда ведёт нажатие.
 *
 * Тот же принцип, что у actionHref коуча: шаг без адреса — это совет, по
 * которому некуда нажать, а карточка с кнопкой в никуда хуже карточки без
 * кнопки. Поэтому неизвестный target возвращает null, и интерфейс просто не
 * рисует кнопку.
 */
export const PATH_STEP_TARGETS = [
  "nutrition",
  "workouts",
  "sleep",
  "habits",
  "appearance",
  "coach",
  "profile",
] as const;

export type PathStepTarget = (typeof PATH_STEP_TARGETS)[number];

export function isPathStepTarget(value: string): value is PathStepTarget {
  return (PATH_STEP_TARGETS as readonly string[]).includes(value);
}

const TARGET_HREF: Record<PathStepTarget, string> = {
  nutrition: "/nutrition",
  workouts: "/workouts",
  sleep: "/sleep",
  habits: "/habits",
  appearance: "/appearance",
  coach: "/coach",
  profile: "/profile",
};

const TARGET_LABEL: Record<PathStepTarget, string> = {
  nutrition: "Открыть питание",
  workouts: "Открыть тренировки",
  sleep: "Открыть сон",
  habits: "Открыть привычки",
  appearance: "Открыть внешность",
  coach: "Спросить коуча",
  profile: "Открыть профиль",
};

export function stepHref(target: string | null): string | null {
  if (target === null || !isPathStepTarget(target)) return null;
  return TARGET_HREF[target];
}

export function stepActionLabel(target: string | null): string | null {
  if (target === null || !isPathStepTarget(target)) return null;
  return TARGET_LABEL[target];
}
