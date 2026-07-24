export interface LifeScoreBreakdownItem {
  key: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface LifeScoreResult {
  score: number;
  breakdown: LifeScoreBreakdownItem[];
}

export interface LifeScoreInput {
  hasCompletedProfile: boolean;
  heightCm: number | null;
  weightKg: number | null;
  goalsCount: number;
  habitsCount: number;
  tasksCount: number;
}
