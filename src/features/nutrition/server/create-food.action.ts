"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createFood } from "@/features/nutrition/server/nutrition.repository";
import { foodDraftSchema } from "@/features/nutrition/schemas";

const createFoodInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: foodDraftSchema,
});

export type CreateFoodInput = z.input<typeof createFoodInputSchema>;

export async function createFoodAction(input: CreateFoodInput) {
  const { rawInitData, draft } = createFoodInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const food = await createFood(userId, draft);

  return { success: true, foodId: food.id } as const;
}
