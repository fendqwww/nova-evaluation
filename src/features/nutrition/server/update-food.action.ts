"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateFood } from "@/features/nutrition/server/nutrition.repository";
import { foodDraftSchema } from "@/features/nutrition/schemas";

const updateFoodInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  foodId: z.string().min(1),
  draft: foodDraftSchema,
});

export type UpdateFoodInput = z.input<typeof updateFoodInputSchema>;

export async function updateFoodAction(input: UpdateFoodInput) {
  const { rawInitData, foodId, draft } = updateFoodInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateFood(userId, foodId, draft);
  if (!updated) throw new Error("FOOD_NOT_FOUND");

  return { success: true } as const;
}
