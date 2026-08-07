import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/shared/config/env";
import { PLANS } from "@/features/settings/schemas";
import {
  activatePlan,
  deactivatePlan,
  findPlanTarget,
  isGrantablePlan,
} from "@/features/settings/server/subscription.repository";

/**
 * Turn a paid tier on by hand, for the window before payments exist.
 *
 * The whole manual flow ends here: someone messages @nheavyy from the
 * subscription screen, pays however we agreed, and this is the one call that
 * grants them PLUS. It is deliberately an HTTP endpoint rather than a script
 * or a server action — a script only works against a local database, and a
 * server action would have to be reachable from a screen, which would mean
 * building an admin UI nobody needs yet. A curl from a phone is enough.
 *
 * Protected by a shared secret in ADMIN_SECRET, compared in constant time. If
 * the variable is unset the route 404s: an admin endpoint that exists with no
 * password configured is worse than one that does not exist, and defaulting to
 * "off" means a deploy that forgets the variable fails closed.
 *
 *   curl -X POST https://<host>/api/admin/activate-plan \
 *     -H "content-type: application/json" \
 *     -H "x-admin-secret: $ADMIN_SECRET" \
 *     -d '{"handle":"@someone","plan":"plus","days":30}'
 *
 * `days: null` grants the tier with no end date. To revoke, send
 * `{"handle":"@someone","plan":"free"}` — see deactivatePlan.
 */

const bodySchema = z.object({
  /** @username, numeric Telegram id, or the internal user id. */
  handle: z.string().min(1),
  plan: z.enum(PLANS),
  /** Days to grant. Null means no end date. Ignored when plan is "free". */
  days: z.number().int().positive().max(3650).nullable().default(30),
});

export async function POST(request: Request) {
  const secret = env.ADMIN_SECRET;
  if (!secret) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!timingSafeEqual(request.headers.get("x-admin-secret") ?? "", secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad_request", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { handle, plan, days } = parsed.data;

  const target = await findPlanTarget(handle);
  if (!target) {
    return NextResponse.json({ ok: false, error: "user_not_found", handle }, { status: 404 });
  }

  // "free" is the revoke path rather than a grant — activatePlan would
  // otherwise write a period onto a tier that has none.
  if (!isGrantablePlan(plan)) {
    await deactivatePlan(target.userId);
    return NextResponse.json({ ok: true, user: target, plan, until: null });
  }

  const grant = await activatePlan(target.userId, plan, days, "manual");

  return NextResponse.json({ ok: true, user: target, ...grant });
}

/**
 * Constant-time string comparison.
 *
 * A plain `===` on a secret leaks its length and its matching prefix through
 * timing. That is a thin attack over the internet, but this is the one door in
 * the app that hands out paid tiers, and comparing safely costs nothing.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}
