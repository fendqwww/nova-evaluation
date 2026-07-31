"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setFoodFavorite } from "@/features/nutrition/server/nutrition.repository";

const setFoodFavoriteInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  foodId: z.string().min(1),
  isFavorite: z.boolean(),
});

export type SetFoodFavoriteInput = z.input<typeof setFoodFavoriteInputSchema>;

export async function setFoodFavoriteAction(input: SetFoodFavoriteInput) {
  const { rawInitData, foodId, isFavorite } = setFoodFavoriteInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setFoodFavorite(userId, foodId, isFavorite);
  if (!updated) throw new Error("FOOD_NOT_FOUND");

  return { success: true } as const;
}
