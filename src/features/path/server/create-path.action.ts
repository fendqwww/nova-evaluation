"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { getSettings } from "@/features/settings/server/settings.repository";
import { hasAiConsent } from "@/features/legal/server";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { consumeCoachMessage, refundCoachMessage } from "@/features/usage/server";
import { buildPathPlan, isPathModelEnabled } from "@/ai/path";
import { pathDraftSchema } from "@/features/path/schemas";
import { PATH_GOAL_KIND_META } from "@/features/path/lib/goal-kinds";
import { templatePlan } from "@/features/path/lib/template-plans";
import { buildPathFacts } from "@/features/path/server/build-path-facts";
import { createPath } from "@/features/path/server/path.repository";
import type { ActivityLevel } from "@/features/nutrition/lib/targets";

const inputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: pathDraftSchema,
});

export type CreatePathInput = z.input<typeof inputSchema>;

/**
 * Насколько сдвигается вес, когда человек не назвал целевой.
 *
 * Не «идеальный вес по ИМТ»: считать за человека, каким ему следует быть, —
 * это медицинское утверждение, которого приложение себе не позволяет (см.
 * правило 4 в промпте). Восемь процентов на снижение и четыре на набор — это
 * заведомо достижимый шаг, который потом можно повторить, а не приговор к
 * конечной цифре.
 */
const DEFAULT_LOSS_SHARE = 0.08;
const DEFAULT_GAIN_SHARE = 0.04;

export type CreatePathResult =
  | { ok: true; pathId: string; source: "model" | "template" }
  | { ok: false; message: string };

/**
 * «Создать мой путь».
 *
 * ГЛАВНОЕ СВОЙСТВО: эта функция не умеет не создать путь. Ни отсутствие ключа к
 * Gemini, ни исчерпанный лимит, ни выключенный коуч, ни отозванное согласие на
 * передачу данных не мешают человеку получить план — во всех этих случаях
 * записывается шаблонный маршрут из lib/template-plans.ts, который является
 * полноценным планом, а не заглушкой. Модель улучшает результат под конкретного
 * человека; она не является условием существования функции.
 *
 * Порядок операций — тот же, что у остальных AI-поверхностей, и по тем же
 * причинам:
 *
 *   1. Черновик считается до всякой модели, чтобы дальше было чем ответить.
 *   2. Единица лимита резервируется атомарно перед вызовом: проверка «сколько
 *      осталось» с последующим вызовом — это гонка, в которой двойное нажатие
 *      тратит два запроса.
 *   3. Единица возвращается на любом отказе модели. План, который человек
 *      получил от шаблона, не может стоить ему запроса к коучу.
 *
 * Путь тратит из бюджета коуча, а не из своего собственного счётчика. Это
 * сознательно: новый UsageFeature означал бы новую колонку в UserUsage, миграцию
 * и правку логики лимитов — то есть изменение работающей системы тарифов ради
 * одной кнопки, которую человек нажимает раз в три месяца.
 */
export async function createPathAction(input: CreatePathInput): Promise<CreatePathResult> {
  const { rawInitData, draft } = inputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  const profile = await db.profile.findUnique({
    where: { userId },
    select: { weightKg: true, activityLevel: true },
  });

  if (!profile) {
    return { ok: false, message: "Профиль не заполнен — пройди онбординг заново." };
  }

  const meta = PATH_GOAL_KIND_META[draft.goalKind];

  // --- Границы измеримой цели ---------------------------------------------
  const startValue = meta.measure ? profile.weightKg : null;
  const targetValue = meta.measure
    ? (draft.targetValue ??
      Math.round(
        profile.weightKg *
          (meta.measure.direction === "down"
            ? 1 - DEFAULT_LOSS_SHARE
            : 1 + DEFAULT_GAIN_SHARE),
      ))
    : null;
  const unit = meta.measure ? meta.measure.unit : null;

  const draftPlan = templatePlan({ kind: draft.goalKind, startValue, targetValue });

  // --- Улучшение моделью, когда оно разрешено и возможно -------------------
  const settings = await getSettings(userId);
  const canAskModel =
    isPathModelEnabled() && settings.ai.coachEnabled && (await hasAiConsent(userId));

  if (!canAskModel) {
    const pathId = await createPath(userId, {
      goalKind: draft.goalKind,
      plan: draftPlan,
      startValue,
      targetValue,
      unit,
      source: "template",
    });
    return { ok: true, pathId, source: "template" };
  }

  const usage = { userId, plan: settings.plan, today: todayIn(timezone) };
  const permission = await consumeCoachMessage(usage);

  if (!permission.success) {
    const pathId = await createPath(userId, {
      goalKind: draft.goalKind,
      plan: draftPlan,
      startValue,
      targetValue,
      unit,
      source: "template",
    });
    return { ok: true, pathId, source: "template" };
  }

  const analysis = await buildCoachAnalysis(userId, timezone);
  const fromModel = await buildPathPlan({
    kind: draft.goalKind,
    wish: draft.wish,
    facts: buildPathFacts({
      analysis,
      kind: draft.goalKind,
      activityLevel: (profile.activityLevel as ActivityLevel | null) ?? null,
      targetValue,
    }),
    draft: draftPlan,
  });

  if (!fromModel) {
    await refundCoachMessage(usage);
  }

  const pathId = await createPath(userId, {
    goalKind: draft.goalKind,
    plan: fromModel ?? draftPlan,
    startValue,
    targetValue,
    unit,
    source: fromModel ? "model" : "template",
  });

  return { ok: true, pathId, source: fromModel ? "model" : "template" };
}
