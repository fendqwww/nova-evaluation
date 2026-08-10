"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setLessonCompleted } from "@/features/academy/server/academy.repository";

const inputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  lessonId: z.string().min(1).max(64),
  isCompleted: z.boolean(),
});

export type SetLessonCompletedInput = z.input<typeof inputSchema>;

export async function setLessonCompletedAction(input: SetLessonCompletedInput) {
  const { rawInitData, lessonId, isCompleted } = inputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  await setLessonCompleted(userId, lessonId, isCompleted);

  return { success: true } as const;
}
