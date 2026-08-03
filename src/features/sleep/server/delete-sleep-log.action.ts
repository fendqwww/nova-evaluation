"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteLog } from "@/features/sleep/server/sleep.repository";

const deleteSleepLogInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  logId: z.string().min(1),
});

export type DeleteSleepLogInput = z.input<typeof deleteSleepLogInputSchema>;

export async function deleteSleepLogAction(input: DeleteSleepLogInput) {
  const { rawInitData, logId } = deleteSleepLogInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteLog(userId, logId);
  if (!deleted) throw new Error("SLEEP_LOG_NOT_FOUND");

  return { success: true } as const;
}
