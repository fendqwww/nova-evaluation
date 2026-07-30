"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { COACH_HISTORY_PAGE, getCoachHistoryInputSchema } from "@/features/coach/schemas";
import { listCoachMessagesBefore } from "@/features/coach/server/coach.repository";
import type { CoachHistoryPage } from "@/features/coach/types";

export type GetCoachHistoryInput = z.input<typeof getCoachHistoryInputSchema>;

/**
 * The page of turns older than `beforeId` — what "показать раньше" loads.
 *
 * Keyset, not offset: history only ever grows at the newest end, so an offset
 * would shift under any answer written while the user is reading back. An id
 * that belongs to someone else matches nothing and returns an empty page,
 * because the lookup is scoped by userId inside the repository.
 */
export async function getCoachHistory(
  input: GetCoachHistoryInput,
): Promise<CoachHistoryPage> {
  const { rawInitData, beforeId } = getCoachHistoryInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  return listCoachMessagesBefore(userId, beforeId, COACH_HISTORY_PAGE);
}
