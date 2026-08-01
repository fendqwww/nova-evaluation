/**
 * What the user is actually asking.
 *
 * Ten of these are the quick-action chips; `general` is where a typed question
 * lands when nothing matches. The intent picks which slice of the analysis an
 * answer leads with — it never decides *what is true*, which is why a wrong
 * guess degrades the emphasis of an answer and nothing more.
 */
export const COACH_INTENT_IDS = [
  "brief",
  "score_drop",
  "improve_day",
  "now",
  "weak_habits",
  "workouts",
  "nutrition",
  "appearance",
  "overdue",
  "evening",
  "goal_speed",
  "mistakes",
  "next_step",
  "general",
] as const;

export type CoachIntent = (typeof COACH_INTENT_IDS)[number];

export interface CoachQuickAction {
  intent: CoachIntent;
  /** The chip label — and the question that gets written into the history. */
  label: string;
}

/**
 * The chips under the composer. Each one is a real question: tapping it writes
 * exactly this text as the user's turn, so the history reads like a
 * conversation rather than a log of button ids.
 */
export const COACH_QUICK_ACTIONS: CoachQuickAction[] = [
  { intent: "score_drop", label: "Почему индекс упал?" },
  { intent: "improve_day", label: "Как улучшить день?" },
  { intent: "now", label: "Что сделать сейчас?" },
  { intent: "weak_habits", label: "Какие привычки самые слабые?" },
  { intent: "workouts", label: "Как идут тренировки?" },
  { intent: "nutrition", label: "Как у меня с питанием?" },
  { intent: "appearance", label: "Как идёт уход за собой?" },
  { intent: "overdue", label: "Что просрочено?" },
  { intent: "evening", label: "Что мне делать вечером?" },
  { intent: "goal_speed", label: "Как быстрее достичь цели?" },
  { intent: "mistakes", label: "Покажи мои ошибки" },
  { intent: "next_step", label: "Какой следующий шаг?" },
];

/**
 * Keyword weights per intent, lower-cased and stem-ish.
 *
 * Deliberately prefix matches rather than whole words: Russian inflects
 * everything ("привычк" covers привычка/привычки/привычек/привычкам), and a
 * whole-word list long enough to cover the cases would be both larger and
 * easier to get wrong.
 */
const INTENT_KEYWORDS: Record<Exclude<CoachIntent, "general" | "brief">, string[]> = {
  score_drop: ["индекс", "балл", "score", "упал", "снизил", "понизил", "падает"],
  improve_day: ["улучшить", "лучше", "поднять", "прокачать", "исправить день"],
  now: ["сейчас", "прямо сейчас", "чем занят", "с чего начать"],
  weak_habits: ["привычк", "слаб", "проседа", "серия", "стрик"],
  // Long, specific stems on purpose: this is the intent most likely to be hit
  // by a question that also mentions a habit ("как идут тренировки и привычки"),
  // and longest-match-wins is what decides between them.
  workouts: [
    "тренировк",
    "трениру",
    "зал",
    "спорт",
    "упражнен",
    "подход",
    "жим",
    "присед",
    "тягу",
    "кардио",
    "штанг",
    "вес на штанге",
    "объём",
    "тоннаж",
  ],
  nutrition: [
    "еда",
    "питани",
    "калори",
    "белк",
    "жир",
    "углевод",
    "рацион",
    "дневник питания",
    "вода",
    "воды",
  ],
  // Long, specific stems for the same reason the workouts list has them: this
  // intent is the one most likely to collide with a question that also mentions
  // a habit ("привычка ухаживать за кожей"), and longest-match-wins decides.
  appearance: [
    "внешност",
    "уход за",
    "ухаживать",
    "кожа",
    "кожи",
    "кожей",
    "волос",
    "зуб",
    "бород",
    "ногт",
    "маникюр",
    "процедур",
    "фото прогресса",
    "до и после",
  ],
  overdue: ["просроч", "дедлайн", "опозда", "горит", "сроки"],
  evening: ["вечер", "ночь", "перед сном", "закончить день", "итог дня"],
  goal_speed: ["цел", "быстрее", "достич", "goal", "шаг к цели"],
  mistakes: ["ошибк", "не так", "проблем", "мешает", "провал"],
  next_step: ["следующ", "дальше", "что потом", "план"],
};

/**
 * Best-effort intent for a typed question.
 *
 * A single scan, longest-match-wins, with ties broken by the declaration order
 * above — narrower intents ("просрочено") are listed before broader ones
 * ("следующий шаг") so a question that mentions both lands on the specific one.
 * There is no attempt at real NLU here: when Claude is configured it reads the
 * question itself, and when it is not, an honest overview beats a confidently
 * wrong topic.
 */
export function detectIntent(question: string): CoachIntent {
  const text = question.toLocaleLowerCase("ru");

  let best: CoachIntent = "general";
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const score = keywords.reduce(
      (total, keyword) => (text.includes(keyword) ? total + keyword.length : total),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = intent as CoachIntent;
    }
  }

  return best;
}
