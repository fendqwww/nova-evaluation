import { addDays } from "@/shared/lib/calendar-day";
import type {
  CoachAnalysis,
  CoachDailyReport,
  CoachReportRow,
} from "@/features/coach/types";

/**
 * Yesterday against today, on the metrics that can be reconstructed exactly.
 *
 * Every row here is a number both days can answer honestly from the same
 * tables — the Life Score, habit adherence, workout adherence, task throughput,
 * the open and overdue backlog, active goals. Deliberately absent: anything
 * whose history does not exist. Height and weight have no past values, so a
 * "вес" row would be a flat line pretending to be a measurement, and weekly
 * training volume is left out for the same reason yesterday's metrics carry a
 * zero for it — it is not reconstructed, so it must not be compared.
 *
 * The report is recomputed on every read rather than written once a night.
 * That is what makes it correct for a user who did not open the app yesterday,
 * and what stops a stale row from surviving a habit being un-ticked.
 *
 * The nutrition row only appears once a goal exists: adherence is 0/0 without
 * one, and a 0% row for a block the user has never turned on would read as a
 * failure rather than as "not started".
 */
export function buildDailyReport(analysis: CoachAnalysis): CoachDailyReport {
  const yesterdayDay = addDays(analysis.today, -1);
  const previous = analysis.yesterday;

  if (!previous) {
    return {
      today: analysis.today,
      yesterdayDay,
      hasYesterday: false,
      rows: [],
      improved: [],
      worsened: [],
    };
  }

  const rows: CoachReportRow[] = [
    row("score", "Индекс жизни", previous.lifeScore.score, analysis.metrics.lifeScore.score, true, "number"),
    row(
      "habits",
      "Привычки за неделю",
      Math.round(previous.habitAdherence * 100),
      Math.round(analysis.metrics.habitAdherence * 100),
      true,
      "percent",
    ),
    row(
      "workouts",
      "Тренировки за неделю",
      Math.round(previous.workoutAdherence * 100),
      Math.round(analysis.metrics.workoutAdherence * 100),
      true,
      "percent",
    ),
    row(
      "workouts-done",
      "Выполнено тренировок за неделю",
      previous.workoutsWeek,
      analysis.metrics.workoutsWeek,
      true,
      "number",
    ),
    row("tasks-done", "Закрыто задач за неделю", previous.tasksCompletedWeek, analysis.metrics.tasksCompletedWeek, true, "number"),
    row("tasks-overdue", "Просрочено задач", previous.tasksOverdue, analysis.metrics.tasksOverdue, false, "number"),
    row("tasks-open", "Открытых задач", previous.tasksOpen, analysis.metrics.tasksOpen, false, "number"),
    row("goals", "Целей в работе", previous.goalsActive, analysis.metrics.goalsActive, true, "number"),
    ...(analysis.nutrition.hasGoal
      ? [
          row(
            "nutrition-days",
            "Дней с записями в питании",
            previous.nutritionDaysWeek,
            analysis.metrics.nutritionDaysWeek,
            true,
            "number" as const,
          ),
        ]
      : []),
  ];

  const improved: string[] = [];
  const worsened: string[] = [];

  for (const item of rows) {
    if (item.delta === 0) continue;
    // "Better" is not "bigger": one more overdue task is a worse day, and the
    // row itself is what knows which direction it wants to move.
    const isBetter = item.higherIsBetter ? item.delta > 0 : item.delta < 0;
    (isBetter ? improved : worsened).push(describe(item));
  }

  return {
    today: analysis.today,
    yesterdayDay,
    hasYesterday: true,
    rows,
    improved,
    worsened,
  };
}

function row(
  key: string,
  label: string,
  yesterday: number,
  today: number,
  higherIsBetter: boolean,
  format: CoachReportRow["format"],
): CoachReportRow {
  return { key, label, yesterday, today, delta: today - yesterday, higherIsBetter, format };
}

function describe(item: CoachReportRow): string {
  const size = Math.abs(item.delta);
  const unit = item.format === "percent" ? "%" : "";

  switch (item.key) {
    case "score":
      return `Индекс ${item.delta > 0 ? "вырос" : "снизился"} на ${size}`;
    case "habits":
      return `Дисциплина по привычкам ${item.delta > 0 ? "выросла" : "упала"} на ${size}${unit}`;
    case "workouts":
      return `Выполнение плана тренировок ${item.delta > 0 ? "выросло" : "упало"} на ${size}${unit}`;
    case "workouts-done":
      return item.delta > 0
        ? `Тренировок за неделю стало больше на ${size}`
        : `Тренировок за неделю стало меньше на ${size}`;
    case "tasks-done":
      return `Закрыто задач ${item.delta > 0 ? "больше на" : "меньше на"} ${size}`;
    case "tasks-overdue":
      return item.delta > 0
        ? `Просроченных задач стало больше на ${size}`
        : `Просроченных задач стало меньше на ${size}`;
    case "tasks-open":
      return item.delta > 0
        ? `Открытых задач прибавилось: +${size}`
        : `Открытых задач стало меньше на ${size}`;
    case "goals":
      return item.delta > 0
        ? `Целей в работе стало больше на ${size}`
        : `Целей в работе стало меньше на ${size}`;
    case "nutrition-days":
      return item.delta > 0
        ? `Дней с записями в питании стало больше на ${size}`
        : `Дней с записями в питании стало меньше на ${size}`;
    default:
      return `${item.label}: ${item.delta > 0 ? "+" : ""}${item.delta}${unit}`;
  }
}
