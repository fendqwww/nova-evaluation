"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { upsertLog } from "@/features/sleep/server/sleep.repository";
import { sleepLogDraftSchema } from "@/features/sleep/schemas";

const upsertSleepLogInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: sleepLogDraftSchema,
});

export type UpsertSleepLogInput = z.input<typeof upsertSleepLogInputSchema>;

export async function upsertSleepLogAction(input: UpsertSleepLogInput) {
  const { rawInitData, draft } = upsertSleepLogInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const log = await upsertLog(userId, draft);

  return { success: true, log } as const;
}
