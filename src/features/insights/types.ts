import type { PrimaryGoalValue } from "@/features/onboarding/schemas";

export interface Insight {
  id: string;
  title: string;
  body: string;
}

export interface InsightContext {
  firstName: string;
  primaryFocus: PrimaryGoalValue;
  goalsCount: number;
  habitsCount: number;
  tasksCount: number;
  lifeScore: number;
}
