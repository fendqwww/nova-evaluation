"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteOrArchiveFood } from "@/features/nutrition/server/nutrition.repository";

const deleteFoodInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  foodId: z.string().min(1),
});

export type DeleteFoodInput = z.input<typeof deleteFoodInputSchema>;

export async function deleteFoodAction(input: DeleteFoodInput) {
  const { rawInitData, foodId } = deleteFoodInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteOrArchiveFood(userId, foodId);
  if (!deleted) throw new Error("FOOD_NOT_FOUND");

  return { success: true } as const;
}
