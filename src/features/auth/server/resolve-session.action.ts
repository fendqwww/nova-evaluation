"use server";

import { db } from "@/server/db";
import { verifyTelegramInitData } from "@/server/auth/telegram";

export interface ResolvedProfile {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  gender: string;
  primaryGoal: string;
  occupation: string;
  timezone: string;
}

export interface ResolvedSession {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
  };
  onboardingCompleted: boolean;
  profile: ResolvedProfile | null;
}

export async function resolveSession(rawInitData: string): Promise<ResolvedSession> {
  const identity = verifyTelegramInitData(rawInitData);

  const user = await db.user.upsert({
    where: { telegramId: identity.telegramId },
    update: {
      firstName: identity.firstName,
      lastName: identity.lastName,
      username: identity.username,
      languageCode: identity.languageCode,
      photoUrl: identity.photoUrl,
    },
    create: {
      telegramId: identity.telegramId,
      firstName: identity.firstName,
      lastName: identity.lastName,
      username: identity.username,
      languageCode: identity.languageCode,
      photoUrl: identity.photoUrl,
    },
    include: { profile: true },
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    },
    onboardingCompleted: user.onboardingCompletedAt !== null,
    profile: user.profile
      ? {
          name: user.profile.name,
          age: user.profile.age,
          heightCm: user.profile.heightCm,
          weightKg: user.profile.weightKg,
          gender: user.profile.gender,
          primaryGoal: user.profile.primaryGoal,
          occupation: user.profile.occupation,
          timezone: user.profile.timezone,
        }
      : null,
  };
}
