"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateRoutine } from "@/features/appearance/server/appearance.repository";
import { routineDraftSchema } from "@/features/appearance/schemas";

const updateRoutineInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  routineId: z.string().min(1),
  draft: routineDraftSchema,
});

export type UpdateRoutineInput = z.input<typeof updateRoutineInputSchema>;

export async function updateRoutineAction(input: UpdateRoutineInput) {
  const { rawInitData, routineId, draft } = updateRoutineInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateRoutine(userId, routineId, draft);
  if (!updated) throw new Error("ROUTINE_NOT_FOUND");

  return { success: true } as const;
}
