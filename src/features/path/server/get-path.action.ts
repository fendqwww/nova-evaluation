"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { requireUserId } from "@/server/auth/current-user";
import {
  countArchivedPaths,
  getActivePath,
} from "@/features/path/server/path.repository";
import type { PathSnapshot } from "@/features/path/types";

const inputSchema = z.object({ rawInitData: z.string().min(1).optional() });
export type GetPathInput = z.input<typeof inputSchema>;

/**
 * Экран «Мой путь» одним запросом.
 *
 * Текущий вес едет вместе с путём, а не запрашивается отдельно: прогресс
 * измеримой цели — это разница между стартом и текущим весом, и два запроса
 * означали бы возможность отрендерить прогресс от устаревшего веса.
 */
export async function getPath(rawInitData: string | undefined): Promise<PathSnapshot> {
  const { rawInitData: raw } = inputSchema.parse({ rawInitData });
  const userId = await requireUserId(raw);

  const [path, archivedCount, profile] = await Promise.all([
    getActivePath(userId),
    countArchivedPaths(userId),
    db.profile.findUnique({ where: { userId }, select: { weightKg: true } }),
  ]);

  return {
    path,
    currentWeightKg: profile?.weightKg ?? null,
    archivedCount,
  };
}
