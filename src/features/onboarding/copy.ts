import {
  OCCUPATION_LABELS,
  PRIMARY_GOAL_LABELS,
  type OccupationValue,
  type PrimaryGoalValue,
} from "@/features/onboarding/schemas";

/**
 * What Nova says back.
 *
 * The reason onboarding felt like a questionnaire was never the styling — it
 * was that the app asked seven questions in a row and never responded to a
 * single answer. These are the responses: each one takes something the user
 * just told Nova and turns it into a commitment about what Nova will do with
 * it. Without this file the flow is a form no matter how it's typeset.
 */

/** Nova's answer to the primary-goal question, keyed by the chosen goal. */
export const GOAL_RESPONSE: Record<
  PrimaryGoalValue,
  { title: string; body: string }
> = {
  productivity: {
    title: "Тогда держим фокус на продуктивности",
    body: "Буду следить за задачами и глубокой работой — чтобы важное не тонуло в срочном.",
  },
  health: {
    title: "Тогда держим фокус на здоровье",
    body: "Сон, тренировки и восстановление — буду держать их в балансе, а не просто считать шаги.",
  },
  mindfulness: {
    title: "Тогда держим фокус на осознанности",
    body: "Помогу выстроить ритуалы и паузы, в которых ты замечаешь своё состояние вовремя.",
  },
  finance: {
    title: "Тогда держим фокус на финансах",
    body: "Возьму на себя привычки, которые двигают твои деньги в правильную сторону.",
  },
  all_in_one: {
    title: "Тогда держим в поле зрения всё",
    body: "Буду смотреть на все сферы сразу и подсказывать, какая из них просит внимания.",
  },
};

/**
 * The closing recap — Nova repeating the person back to them. This is the
 * emotional peak of the flow, which is why it ends here and not on a colour
 * picker: the last thing the user sees is proof that Nova was listening.
 */
export function buildRecap(values: {
  occupation?: OccupationValue;
  primaryGoal?: PrimaryGoalValue;
  age?: number;
}): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (values.primaryGoal) {
    rows.push({ label: "Главный фокус", value: PRIMARY_GOAL_LABELS[values.primaryGoal] });
  }
  if (values.occupation) {
    rows.push({ label: "Контекст", value: OCCUPATION_LABELS[values.occupation] });
  }
  if (values.age) {
    rows.push({ label: "Возраст", value: `${values.age}` });
  }

  return rows;
}
