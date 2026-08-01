"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteRoutine } from "@/features/appearance/server/appearance.repository";

const deleteRoutineInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  routineId: z.string().min(1),
});

export type DeleteRoutineInput = z.input<typeof deleteRoutineInputSchema>;

export async function deleteRoutineAction(input: DeleteRoutineInput) {
  const { rawInitData, routineId } = deleteRoutineInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteRoutine(userId, routineId);
  if (!deleted) throw new Error("ROUTINE_NOT_FOUND");

  return { success: true } as const;
}
