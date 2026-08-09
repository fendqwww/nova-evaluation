import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { constantTimeEqual } from "@/shared/lib/constant-time-equal";
import { BOT_COMMANDS } from "@/features/bot/constants";
import { setBotCommands, setBotMenuButton, setBotWebhook } from "@/features/bot/server/bot-api";

/**
 * Однократная настройка основного бота: вебхук, меню команд, кнопка Mini App.
 *
 * Три вызова, которые иначе пришлось бы делать руками через curl или @BotFather
 * и о которых легко забыть — а забытый setMyCommands означает бота, чьи команды
 * работают, но о которых пользователь не знает.
 *
 * GET, а не POST: это открывают в браузере после деплоя, один раз. Секрет
 * передаётся параметром, потому что заголовок в адресной строке не наберёшь.
 * Защищён ADMIN_SECRET и 404-ит без него — тот же принцип, что у всех
 * административных маршрутов здесь.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = env.ADMIN_SECRET;
  if (!secret || !env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Not found", { status: 404 });
  }

  const presented = new URL(request.url).searchParams.get("secret") ?? "";
  if (!constantTimeEqual(presented, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const webhookUrl = `${origin}/api/telegram/app`;
  const appUrl = origin;

  const [webhook, commands, menu] = await Promise.all([
    setBotWebhook(webhookUrl, env.TELEGRAM_WEBHOOK_SECRET),
    setBotCommands(BOT_COMMANDS),
    setBotMenuButton(appUrl),
  ]);

  return NextResponse.json({
    ok: webhook,
    webhook: { url: webhookUrl, registered: webhook },
    commands: { registered: commands, list: BOT_COMMANDS.map((item) => `/${item.command}`) },
    menuButton: { registered: menu, url: appUrl },
    hint: webhook
      ? "Бот готов. Напишите ему /start."
      : "Вебхук не зарегистрирован — проверьте TELEGRAM_BOT_TOKEN.",
  });
}
