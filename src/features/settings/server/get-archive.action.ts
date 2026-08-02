"use server";

import { requireUserId } from "@/server/auth/current-user";
import { listArchive } from "@/features/settings/server/settings.repository";
import type { ArchiveItem } from "@/features/settings/types";

/**
 * Everything archived across the four sections that archive.
 *
 * Its own action rather than part of the settings snapshot: the archive is
 * usually empty and almost never looked at, so it is fetched when the modal
 * opens instead of on every visit to the screen. The snapshot carries only the
 * count.
 */
export async function getArchiveAction(
  rawInitData: string | undefined,
): Promise<ArchiveItem[]> {
  const userId = await requireUserId(rawInitData);
  return listArchive(userId);
}
