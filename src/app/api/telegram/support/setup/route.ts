import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { constantTimeEqual } from "@/shared/lib/constant-time-equal";
import { supportAdminIds } from "@/features/support/server/admins";
import {
  deleteWebhook,
  getMe,
  getWebhookInfo,
  setMyCommands,
  setWebhook,
} from "@/features/support/server/telegram-api";
import { logInfo } from "@/features/support/lib/log";

/**
 * Point Telegram at this deployment, and check that it took.
 *
 * A webhook has to be registered once per bot per URL, and the URL changes
 * with the environment — which makes this a deploy step, not a build step. It
 * is an HTTP endpoint for the same reason the plan-activation route is: a
 * script would only work from a machine that has the production token, and a
 * curl works from anywhere.
 *
 *   Register:
 *     curl -X POST https://<host>/api/telegram/support/setup \
 *       -H "x-admin-secret: $ADMIN_SECRET"
 *
 *   Check (pending updates, last error Telegram saw, resolved bot username):
 *     curl https://<host>/api/telegram/support/setup \
 *       -H "x-admin-secret: $ADMIN_SECRET"
 *
 *   Unregister (local development, so a deployed instance stops competing):
 *     curl -X DELETE https://<host>/api/telegram/support/setup \
 *       -H "x-admin-secret: $ADMIN_SECRET"
 *
 * Guarded by ADMIN_SECRET, the same door as /api/admin/activate-plan, and 404s
 * when it is unset for the same fail-closed reason.
 */

export const dynamic = "force-dynamic";

/** Shared gate: 404 with no secret configured, 401 with the wrong one. */
function authorize(request: Request): NextResponse | null {
  if (!env.ADMIN_SECRET) return new NextResponse("Not found", { status: 404 });

  const presented = request.headers.get("x-admin-secret") ?? "";
  if (!constantTimeEqual(presented, env.ADMIN_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!env.TELEGRAM_SUPPORT_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error: "not_configured",
        missing: [
          env.TELEGRAM_SUPPORT_BOT_TOKEN ? null : "TELEGRAM_SUPPORT_BOT_TOKEN",
          env.TELEGRAM_WEBHOOK_SECRET ? null : "TELEGRAM_WEBHOOK_SECRET",
        ].filter(Boolean),
      },
      { status: 400 },
    );
  }

  return null;
}

/**
 * The public URL of the webhook route.
 *
 * Derived from the request rather than from an env var: this endpoint is
 * reached at the very host Telegram will have to call, so the request already
 * knows the answer and there is no second value that can be configured wrong.
 * The forwarded headers are what a proxy or platform edge rewrites, and
 * without them a deployment behind one would register its internal hostname.
 */
function webhookUrl(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}/api/telegram/support`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = authorize(request);
  if (denied) return denied;

  const url = webhookUrl(request);

  // Telegram refuses a non-HTTPS webhook outright. Catching it here turns a
  // confusing "ok: false" from the API into an answer that names the problem.
  if (!url.startsWith("https://")) {
    return NextResponse.json(
      {
        ok: false,
        error: "https_required",
        url,
        hint: "Telegram принимает только HTTPS. Локально используйте туннель (ngrok/cloudflared).",
      },
      { status: 400 },
    );
  }

  const bot = await getMe();
  const registered = await setWebhook(url, env.TELEGRAM_WEBHOOK_SECRET ?? "");
  const commands = await setMyCommands();

  logInfo("webhook_setup", { url, registered, commands, bot: bot?.username ?? null });

  return NextResponse.json({
    ok: registered,
    url,
    bot: bot ? { id: bot.id, username: bot.username ?? null } : null,
    commandsRegistered: commands,
    // Surfaced because an empty roster is the one misconfiguration that leaves
    // tickets sitting in the database with nobody notified — and it is
    // invisible until the first real user writes in.
    admins: supportAdminIds().length,
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = authorize(request);
  if (denied) return denied;

  const [bot, info] = await Promise.all([getMe(), getWebhookInfo()]);

  return NextResponse.json({
    ok: true,
    bot: bot ? { id: bot.id, username: bot.username ?? null } : null,
    expectedUrl: webhookUrl(request),
    webhook: info,
    admins: supportAdminIds().length,
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const denied = authorize(request);
  if (denied) return denied;

  const removed = await deleteWebhook();
  logInfo("webhook_deleted", { removed });

  return NextResponse.json({ ok: removed });
}
