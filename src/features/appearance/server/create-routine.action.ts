"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createRoutine } from "@/features/appearance/server/appearance.repository";
import { routineDraftSchema } from "@/features/appearance/schemas";

const createRoutineInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: routineDraftSchema,
});

export type CreateRoutineInput = z.input<typeof createRoutineInputSchema>;

export async function createRoutineAction(input: CreateRoutineInput) {
  const { rawInitData, draft } = createRoutineInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const routine = await createRoutine(userId, draft);

  return { success: true, routineId: routine.id } as const;
}
