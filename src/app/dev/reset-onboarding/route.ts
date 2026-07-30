import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";

/**
 * Development-only: clears the onboarding state for the current user and drops
 * them back at the first scene.
 *
 * The flow's completion is a single timestamp — User.onboardingCompletedAt —
 * and once it is set the profile row keeps whatever the last run entered. That
 * makes "run the flow again as a brand-new user" impossible to reach from the
 * UI, which is exactly what this route restores. /onboarding also ignores the
 * completion check in development, so this is the tool for the other half of
 * the problem: starting over with an *empty* profile rather than one
 * pre-filled from a previous run.
 *
 * A GET that mutates, which no public endpoint should ever be — the entire
 * point is that you can type it into the address bar. It 404s outside
 * development, so it never exists anywhere that matters.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const identity = resolveIdentity(undefined);

  // deleteMany/updateMany rather than delete/update: both no-op on zero rows,
  // so hitting this route with no user or no profile yet is not an error.
  await db.$transaction([
    db.profile.deleteMany({
      where: { user: { telegramId: identity.telegramId } },
    }),
    db.user.updateMany({
      where: { telegramId: identity.telegramId },
      data: { onboardingCompletedAt: null },
    }),
  ]);

  return NextResponse.redirect(new URL("/onboarding", request.url));
}
