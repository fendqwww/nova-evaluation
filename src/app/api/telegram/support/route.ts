import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { constantTimeEqual } from "@/shared/lib/constant-time-equal";
import { handleUpdate } from "@/features/support/server/handle-update";
import { logError, logWarn } from "@/features/support/lib/log";
import { telegramUpdateSchema } from "@/features/support/schemas";

/**
 * Telegram's webhook for the support bot.
 *
 * Webhook rather than long polling, and the reason is architectural rather
 * than a preference: long polling needs a process that owns a loop and stays
 * alive between requests, and Next.js App Router gives us request handlers. A
 * polling worker would be a second deployable with its own lifecycle sitting
 * beside an app that has exactly one. A webhook is a route.
 *
 * The contract with Telegram shapes everything below:
 *
 *   - **Answer 200, almost always.** Any other status means "retry", and
 *     Telegram will redeliver the same update on a backoff, blocking the ones
 *     behind it. A malformed body, an unknown update type, a handler that
 *     threw — all of those are permanent conditions that retrying cannot fix,
 *     so they are logged and acknowledged. The one exception is a bad secret
 *     token, which is not Telegram calling at all.
 *   - **Finish before responding.** There is no "background work" here: the
 *     runtime is free to freeze or discard the instance the moment the
 *     response is returned, so work started and not awaited is work that may
 *     never happen.
 *
 * Register it with POST /api/telegram/support/setup — see that route.
 */

// The handler reads a secret and writes to the database on every call; there
// is nothing here that could ever be prerendered or cached.
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  // Fail closed, exactly like the admin endpoint: a webhook with no shared
  // secret configured is an open write endpoint, and a deploy that forgot the
  // variable should look like a missing feature rather than an open door.
  if (!env.TELEGRAM_SUPPORT_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Not found", { status: 404 });
  }

  const presented = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!constantTimeEqual(presented, env.TELEGRAM_WEBHOOK_SECRET)) {
    // 401 rather than 200: this is the one caller we *want* to discourage from
    // trying again, and it is by definition not Telegram.
    logWarn("webhook_unauthorized");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = telegramUpdateSchema.safeParse(body);

  if (!parsed.success) {
    // Acknowledged, not rejected. A body this route cannot read will not
    // become readable on the fourth delivery.
    logWarn("webhook_bad_payload");
    return NextResponse.json({ ok: true });
  }

  try {
    await handleUpdate(parsed.data);
  } catch (error) {
    // handleUpdate already swallows its own failures; this is the belt to that
    // braces. Still a 200 — see the note above on what a 500 costs.
    logError("webhook_unhandled", error, { updateId: parsed.data.update_id });
  }

  return NextResponse.json({ ok: true });
}
