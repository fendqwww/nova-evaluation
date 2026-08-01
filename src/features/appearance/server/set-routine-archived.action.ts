"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setRoutineArchived } from "@/features/appearance/server/appearance.repository";

const setRoutineArchivedInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  routineId: z.string().min(1),
  isArchived: z.boolean(),
});

export type SetRoutineArchivedInput = z.input<typeof setRoutineArchivedInputSchema>;

export async function setRoutineArchivedAction(input: SetRoutineArchivedInput) {
  const { rawInitData, routineId, isArchived } = setRoutineArchivedInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setRoutineArchived(userId, routineId, isArchived);
  if (!updated) throw new Error("ROUTINE_NOT_FOUND");

  return { success: true } as const;
}
