import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { constantTimeEqual } from "@/shared/lib/constant-time-equal";
import { runNotificationSweep } from "@/features/bot/server/scheduler";
import { logWarn } from "@/features/bot/lib/log";

/**
 * Ежечасный проход рассылки.
 *
 * Вызывается Vercel Cron по расписанию из vercel.json. Раз в час, а не раз в
 * сутки: «утро» наступает у пользователей в разное время, и суточный запуск
 * попал бы в утро ровно одного часового пояса. Кому сейчас уместно написать,
 * решает планировщик — маршрут только даёт ему повод проснуться.
 *
 * Авторизация двойная, потому что вызывающих двое:
 *
 *   - Vercel Cron присылает заголовок Authorization с CRON_SECRET;
 *   - человек, проверяющий рассылку руками, передаёт ADMIN_SECRET параметром.
 *
 * Без секрета маршрут 404-ит. Открытый эндпоинт рассылки — это кнопка «отправить
 * всем», доступная любому, кто угадал адрес.
 */

export const dynamic = "force-dynamic";
// Проход по всей базе с отправками может занять заметно больше, чем ответ на
// обычный запрос.
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    logWarn("cron_unauthorized");
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await runNotificationSweep();
  return NextResponse.json({ ok: true, ...result });
}

function isAuthorized(request: Request): boolean {
  const cronSecret = env.CRON_SECRET;
  if (cronSecret) {
    const header = request.headers.get("authorization") ?? "";
    if (constantTimeEqual(header, `Bearer ${cronSecret}`)) return true;
  }

  const adminSecret = env.ADMIN_SECRET;
  if (adminSecret) {
    const presented = new URL(request.url).searchParams.get("secret") ?? "";
    if (constantTimeEqual(presented, adminSecret)) return true;
  }

  return false;
}
