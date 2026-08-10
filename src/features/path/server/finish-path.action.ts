"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { archivePath, completePath } from "@/features/path/server/path.repository";

const inputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  pathId: z.string().min(1),
  /**
   * "completed" — цель достигнута, "archived" — от пути отказались.
   *
   * Разные исходы, а не один: человек, прошедший 90 дней, обязан увидеть
   * «завершён», и складывать это в ту же корзину, что и «бросил», значило бы
   * стереть единственный момент, за которым человек шёл.
   */
  outcome: z.enum(["completed", "archived"]),
});

export type FinishPathInput = z.input<typeof inputSchema>;

export async function finishPathAction(input: FinishPathInput) {
  const { rawInitData, pathId, outcome } = inputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const success =
    outcome === "completed"
      ? await completePath(userId, pathId)
      : await archivePath(userId, pathId);

  return { success } as const;
}
