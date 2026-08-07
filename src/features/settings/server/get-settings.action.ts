"use server";

import { db } from "@/server/db";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import {
  countArchived,
  getSettings,
} from "@/features/settings/server/settings.repository";
import { getAiUsageStatus } from "@/ai/limits";
import type { SettingsSnapshot } from "@/features/settings/types";

/**
 * The Настройки screen in one fetch.
 *
 * The account block is read here rather than taken from the session the client
 * already holds: the session is cached by TanStack Query under its own key and
 * can be minutes old, and the timezone shown on this screen is the very thing
 * the screen edits. Reading it in the same round trip as the settings is what
 * keeps the row and the picker agreeing after a save.
 *
 * `archiveCount` travels with the snapshot rather than being its own query
 * because it is one number on one row — the archive's contents are only
 * fetched when the modal actually opens.
 */
export async function getSettingsSnapshot(
  rawInitData: string | undefined,
): Promise<SettingsSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const [user, settings, archiveCount] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        username: true,
        telegramId: true,
        photoUrl: true,
        createdAt: true,
        onboardingCompletedAt: true,
        profile: { select: { name: true, timezone: true } },
      },
    }),
    getSettings(userId),
    countArchived(userId),
  ]);

  // Needs the plan the previous step resolved, so it cannot join the
  // Promise.all above it. The day is the user's own — the budget renews per
  // local day, so a card that read a UTC day would be wrong for half the
  // evening in every zone east of London.
  const usage = await getAiUsageStatus(userId, settings.plan, todayIn(timezone));

  const telegramName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return {
    account: {
      // The profile name is the one the user chose during onboarding; the
      // Telegram name is what the platform supplies. Both are shown, because
      // they are frequently different and the screen would otherwise look like
      // it was ignoring the account it is signed into.
      name: user.profile?.name ?? user.firstName,
      telegramName,
      username: user.username,
      telegramId: user.telegramId,
      photoUrl: user.photoUrl,
      timezone: user.profile?.timezone ?? "UTC",
      createdAt: user.createdAt.toISOString(),
      onboardingCompleted: user.onboardingCompletedAt !== null,
    },
    settings,
    archiveCount,
    aiUsage: { used: usage.used, limit: usage.limit },
  };
}
