import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { constantTimeEqual } from "@/shared/lib/constant-time-equal";
import { getBotIdentity, getBotWebhookInfo } from "@/features/bot/server/bot-api";
import { APP_ORIGIN } from "@/features/bot/server/app-url";

/**
 * Одна страница, отвечающая на вопрос «почему бот молчит».
 *
 * ЗАЧЕМ ОНА НУЖНА. Каждая часть телеграм-стороны отказывает молча и по-своему:
 * незаданный TELEGRAM_WEBHOOK_SECRET заставляет вебхук отвечать 404 (то есть
 * Telegram шлёт обновления в пустоту), забытый вызов /setup означает, что
 * вебхук не зарегистрирован вовсе, а несовпадение секрета даёт 401, который
 * видно только в логах Telegram. Снаружи все три случая выглядят одинаково —
 * «пишу боту, он не отвечает», — и различить их без этого маршрута можно только
 * перебором.
 *
 * ЧТО ОТДАЁТСЯ. Факт настройки каждой переменной, но никогда её значение:
 * маршрут защищён одним секретом, и утечка этого секрета не должна означать
 * утечку остальных. Из Telegram берётся getMe (жив ли токен) и getWebhookInfo,
 * ради единственного по-настоящему ценного поля — last_error_message: именно
 * оно называет причину прямым текстом.
 *
 * GET и защита параметром — как у /setup рядом: это открывают в браузере после
 * деплоя. Без ADMIN_SECRET маршрут 404-ит, как и все административные здесь.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = env.ADMIN_SECRET;
  if (!secret) {
    return new NextResponse("Not found", { status: 404 });
  }

  const presented = new URL(request.url).searchParams.get("secret") ?? "";
  if (!constantTimeEqual(presented, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const expectedAppWebhook = `${origin}/api/telegram/app`;
  const expectedSupportWebhook = `${origin}/api/telegram/support`;

  const supportToken = env.TELEGRAM_SUPPORT_BOT_TOKEN;

  const [appBot, appWebhook, supportBot, supportWebhook] = await Promise.all([
    getBotIdentity(env.TELEGRAM_BOT_TOKEN),
    getBotWebhookInfo(env.TELEGRAM_BOT_TOKEN),
    supportToken ? getBotIdentity(supportToken) : Promise.resolve(null),
    supportToken ? getBotWebhookInfo(supportToken) : Promise.resolve(null),
  ]);

  // Проблемы собираются в список, а не выводятся человеком из полей ниже: смысл
  // маршрута в том, чтобы ответ читался без знания того, как здесь всё устроено.
  const problems: string[] = [];

  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    problems.push(
      "TELEGRAM_WEBHOOK_SECRET не задан — вебхуки обоих ботов отвечают 404, обновления не обрабатываются.",
    );
  }

  if (!appBot) {
    problems.push("TELEGRAM_BOT_TOKEN недействителен: getMe не отвечает.");
  }

  if (appWebhook && appWebhook.url === "") {
    problems.push(
      `Вебхук основного бота не зарегистрирован. Откройте ${origin}/api/telegram/app/setup?secret=…`,
    );
  }

  if (appWebhook && appWebhook.url !== "" && appWebhook.url !== expectedAppWebhook) {
    problems.push(
      `Вебхук основного бота ведёт на ${appWebhook.url}, а этот деплой — ${expectedAppWebhook}. Обновления уходят на другой домен.`,
    );
  }

  if (appWebhook?.last_error_message) {
    problems.push(`Telegram не смог доставить обновление: ${appWebhook.last_error_message}`);
  }

  // Очередь копится, когда обработчик стабильно отвечает не-2xx: Telegram будет
  // присылать то же обновление снова, и новые встанут за ним.
  if (appWebhook && appWebhook.pending_update_count > 20) {
    problems.push(
      `В очереди основного бота ${appWebhook.pending_update_count} необработанных обновлений.`,
    );
  }

  if (!supportToken) {
    problems.push(
      "TELEGRAM_SUPPORT_BOT_TOKEN не задан — бот поддержки выключен, поддержка работает только ссылкой t.me.",
    );
  } else if (supportWebhook && supportWebhook.url === "") {
    problems.push(
      `Вебхук бота поддержки не зарегистрирован. Откройте ${origin}/api/telegram/support/setup?secret=…`,
    );
  }

  if (env.SUPPORT_ADMIN_IDS.length === 0) {
    problems.push(
      "SUPPORT_ADMIN_IDS пуст — тикеты сохраняются, но никому не приходят и админ-команды недоступны.",
    );
  }

  // Без публичного адреса кнопка под сообщением деградирует до ссылки t.me,
  // которая открывает Mini App только при настроенном Main Mini App. Проверять
  // это глазами — значит нажимать кнопку и гадать, почему ничего не произошло.
  if (APP_ORIGIN === null) {
    problems.push(
      "Публичный адрес приложения неизвестен (нет APP_PUBLIC_URL и VERCEL_PROJECT_PRODUCTION_URL) — кнопки под сообщениями бота откроют чат вместо приложения.",
    );
  }

  if (!env.CRON_SECRET) {
    problems.push(
      "CRON_SECRET не задан — Vercel Cron не сможет авторизоваться, рассылка запускается только вручную по ADMIN_SECRET.",
    );
  }

  return NextResponse.json({
    ok: problems.length === 0,
    problems,
    // appOrigin — адрес, который бот подставляет в кнопки web_app. Отличается
    // от origin, когда диагностику открыли на превью-деплое.
    deploy: { origin, appOrigin: APP_ORIGIN },
    env: {
      // Только факт настройки. Значения не отдаются никогда — см. заголовок.
      DATABASE_URL: true,
      TELEGRAM_BOT_TOKEN: true,
      TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET !== undefined,
      TELEGRAM_SUPPORT_BOT_TOKEN: supportToken !== undefined,
      ADMIN_SECRET: true,
      CRON_SECRET: env.CRON_SECRET !== undefined,
      GEMINI_API_KEY: env.GEMINI_API_KEY !== undefined,
      SUPPORT_ADMIN_IDS: env.SUPPORT_ADMIN_IDS.length,
    },
    appBot: {
      username: appBot?.username ?? null,
      webhook: appWebhook?.url ?? null,
      expected: expectedAppWebhook,
      pending: appWebhook?.pending_update_count ?? null,
      lastError: appWebhook?.last_error_message ?? null,
    },
    supportBot: {
      username: supportBot?.username ?? null,
      webhook: supportWebhook?.url ?? null,
      expected: expectedSupportWebhook,
      pending: supportWebhook?.pending_update_count ?? null,
      lastError: supportWebhook?.last_error_message ?? null,
    },
    notifications: {
      sweepUrl: `${origin}/api/cron/notifications`,
      hint: "Запустить проход вручную: добавьте ?secret=<ADMIN_SECRET>. Расписание — см. vercel.json и DEPLOY.md.",
    },
  });
}
