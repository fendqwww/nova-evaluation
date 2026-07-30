"use server";

import { requireUserId } from "@/server/auth/current-user";
import { listGoals } from "@/features/goals/server/goals.repository";
import type { GoalItem } from "@/features/goals/types";

export async function getGoals(
  rawInitData: string | undefined,
): Promise<GoalItem[]> {
  const userId = await requireUserId(rawInitData);
  return listGoals(userId);
}
