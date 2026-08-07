"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { createActivityItem } from "@/features/activity/server/activity.repository";

const createActivityItemInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  type: z.enum(["goal", "habit", "task"]),
  title: z.string().trim().min(1, "Введи название").max(120, "Слишком длинное название"),
});

export type CreateActivityItemInput = z.infer<typeof createActivityItemInputSchema>;

export async function createActivityItemAction(input: CreateActivityItemInput) {
  const { rawInitData, type, title } = createActivityItemInputSchema.parse(input);
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.findUniqueOrThrow({
    where: { telegramId: identity.telegramId },
  });

  await createActivityItem(user.id, type, title);

  return { success: true } as const;
}
