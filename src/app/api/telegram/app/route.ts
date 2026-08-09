import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { constantTimeEqual } from "@/shared/lib/constant-time-equal";
import { handleBotUpdate } from "@/features/bot/server/handle-update";
import { logWarn } from "@/features/bot/lib/log";

/**
 * Вебхук основного бота.
 *
 * Контракт с Telegram тот же, что у бота поддержки, и по тем же причинам:
 * отвечать 200 почти всегда (любой другой код означает «повторить», и Telegram
 * будет присылать то же обновление, блокируя очередь), и заканчивать работу до
 * ответа (среда вправе заморозить контейнер сразу после ответа, поэтому
 * незавершённая работа может не выполниться никогда).
 *
 * Секрет вебхука общий с ботом поддержки — это один и тот же деплой, и
 * заводить второй секрет значило бы усложнить настройку ради разграничения,
 * которого нет: оба маршрута защищает один и тот же сервер.
 *
 * Регистрируется через POST /api/telegram/app/setup.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  // Закрыто по умолчанию: вебхук без секрета — это открытая точка записи.
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Not found", { status: 404 });
  }

  const presented = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!constantTimeEqual(presented, env.TELEGRAM_WEBHOOK_SECRET)) {
    logWarn("webhook_unauthorized");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    logWarn("webhook_bad_payload");
    return NextResponse.json({ ok: true });
  }

  // Разбор — внутри обработчика: у основного бота набор обновлений узкий
  // (сообщение, нажатие кнопки, изменение членства), и отдельная схема на три
  // необязательных поля была бы длиннее самой проверки.
  await handleBotUpdate(body);

  return NextResponse.json({ ok: true });
}
