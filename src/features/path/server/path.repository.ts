import "server-only";
import { db } from "@/server/db";
import { isPathGoalKind, type PathGoalKind } from "@/features/path/lib/goal-kinds";
import type { PathPlan } from "@/features/path/schemas";
import type { PathItem, PathStepItem } from "@/features/path/types";

/**
 * Каждая функция принимает userId вызывающего и вкладывает его в where —
 * владение проверяется запросом, а не отдельной проверкой, которую однажды
 * забудут. Мутации идут через updateMany/deleteMany, потому что { id, userId }
 * не объявлен уникальной парой, а *Many принимает составной фильтр и сообщает 0
 * задетых строк для чужого id: ровно тот ответ, который нужен экшену.
 *
 * ПРАВИЛО ОДНОГО АКТИВНОГО ПУТИ живёт здесь, а не в схеме. Уникальный индекс на
 * (userId, archivedAt = null) в Postgres пришлось бы делать частичным, а Prisma
 * их не выражает; при этом правило продуктовое, а не структурное: архивных путей
 * может быть сколько угодно, и они — история решений человека.
 */

type StepRow = {
  id: string;
  stageIndex: number;
  stageTitle: string;
  stageGoal: string;
  title: string;
  hint: string | null;
  target: string | null;
  position: number;
  isDone: boolean;
};

type PathRow = {
  id: string;
  goalKind: string;
  title: string;
  summary: string;
  startValue: number | null;
  targetValue: number | null;
  unit: string | null;
  horizonDays: number;
  source: string;
  startedAt: Date;
  completedAt: Date | null;
  steps: StepRow[];
};

function toStepItem(step: StepRow): PathStepItem {
  return {
    id: step.id,
    stageIndex: step.stageIndex,
    stageTitle: step.stageTitle,
    stageGoal: step.stageGoal,
    title: step.title,
    hint: step.hint,
    target: step.target,
    position: step.position,
    isDone: step.isDone,
  };
}

/**
 * Строка в PathItem.
 *
 * goalKind проверяется на принадлежность словарю и деградирует в "get_fit", а не
 * бросает: путь, созданный версией с другим набором целей, должен рендериться, а
 * не ронять экран. Та же политика, что у категориальных колонок во всём проекте.
 */
function toPathItem(path: PathRow): PathItem {
  const kind: PathGoalKind = isPathGoalKind(path.goalKind) ? path.goalKind : "get_fit";

  return {
    id: path.id,
    goalKind: kind,
    title: path.title,
    summary: path.summary,
    startValue: path.startValue,
    targetValue: path.targetValue,
    unit: path.unit,
    horizonDays: path.horizonDays,
    source: path.source,
    startedAt: path.startedAt.toISOString(),
    completedAt: path.completedAt?.toISOString() ?? null,
    steps: path.steps.map(toStepItem),
  };
}

const STEP_ORDER = [{ stageIndex: "asc" }, { position: "asc" }] as const;

export async function getActivePath(userId: string): Promise<PathItem | null> {
  const path = await db.novaPath.findFirst({
    where: { userId, archivedAt: null },
    orderBy: { startedAt: "desc" },
    include: { steps: { orderBy: [...STEP_ORDER] } },
  });

  return path === null ? null : toPathItem(path);
}

export async function countArchivedPaths(userId: string): Promise<number> {
  return db.novaPath.count({ where: { userId, archivedAt: { not: null } } });
}

export interface CreatePathInput {
  goalKind: PathGoalKind;
  plan: PathPlan;
  startValue: number | null;
  targetValue: number | null;
  unit: string | null;
  /** "model" | "template" — кто построил план. */
  source: string;
}

/**
 * Создать путь, архивируя предыдущий.
 *
 * Обе записи в одной транзакции: без неё сбой между ними оставил бы человека с
 * двумя активными путями, и `getActivePath` начал бы отдавать то один, то другой
 * в зависимости от порядка сортировки. Это же и есть перестройка плана — «создать
 * заново» и «перестроить» отличаются только тем, что во втором случае цель та же.
 */
export async function createPath(userId: string, input: CreatePathInput): Promise<string> {
  const now = new Date();

  const steps = input.plan.stages.flatMap((stage, stageIndex) =>
    stage.steps.map((step, position) => ({
      stageIndex,
      stageTitle: stage.title,
      stageGoal: stage.goal,
      title: step.title,
      hint: step.hint,
      target: step.target,
      position,
    })),
  );

  const [, created] = await db.$transaction([
    db.novaPath.updateMany({
      where: { userId, archivedAt: null },
      data: { archivedAt: now },
    }),
    db.novaPath.create({
      data: {
        userId,
        goalKind: input.goalKind,
        title: input.plan.title,
        summary: input.plan.summary,
        horizonDays: input.plan.horizonDays,
        startValue: input.startValue,
        targetValue: input.targetValue,
        unit: input.unit,
        source: input.source,
        steps: { create: steps },
      },
      select: { id: true },
    }),
  ]);

  return created.id;
}

/**
 * Отметить шаг.
 *
 * completedAt ходит парой с isDone всегда — то же правило, что у Goal и Task:
 * снятый шаг, сохранивший старую метку, навсегда остался бы «закрытым вчера» в
 * отчётах.
 *
 * Владение проверяется через связь: `path: { userId }` — реляционный фильтр, и
 * чужой id шага не совпадает ни с чем.
 */
export async function setStepDone(
  userId: string,
  stepId: string,
  isDone: boolean,
): Promise<boolean> {
  const { count } = await db.novaPathStep.updateMany({
    where: { id: stepId, path: { userId, archivedAt: null } },
    data: { isDone, completedAt: isDone ? new Date() : null },
  });

  return count > 0;
}

/**
 * Закрыть путь как достигнутый.
 *
 * Отдельно от архивации: достигнутая цель и брошенная — разные факты, и человек,
 * прошедший 90 дней, должен видеть «завершён», а не «архив».
 */
export async function completePath(userId: string, pathId: string): Promise<boolean> {
  const now = new Date();
  const { count } = await db.novaPath.updateMany({
    where: { id: pathId, userId, archivedAt: null },
    data: { completedAt: now, archivedAt: now },
  });

  return count > 0;
}

export async function archivePath(userId: string, pathId: string): Promise<boolean> {
  const { count } = await db.novaPath.updateMany({
    where: { id: pathId, userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  return count > 0;
}
