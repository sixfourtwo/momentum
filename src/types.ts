export type WorkoutCategory = 'strength' | 'cardio' | 'mindfulness';
export type WorkoutDifficulty = 'light' | 'moderate' | 'hard';
export type CategoryStatus = 'ready' | 'rest' | 'window' | 'missed';

export interface WorkoutLog {
  id: string; // UUID
  category: WorkoutCategory;
  timestamp: number; // Epoch ms (when workout finished)
  durationMinutes: number; // Stored for future features; does not drive timers in v1
  difficulty: WorkoutDifficulty;
  createdAt: number;
}

export interface FitnessProfile {
  id: 'default_profile';
  onboardingCompleted: boolean;
  assessedAt: number; // Epoch ms
  initialScores: Record<WorkoutCategory, number>; // 0 to 600 scale
  answers?: Record<string, number>; // Optional snapshot of questionnaire inputs
}

export interface CategoryState {
  /** Continuous score, 0–600. */
  totalScore: number;
  /** 1–6 */
  level: number;
  levelName: string;
  /** 0–100, progress within the current level. */
  ringPercent: number;
  status: CategoryStatus;
  /** 0–100 fill of the horizontal depleting bar, or null when no bar applies (ready). */
  barFillPercent: number | null;
  /** ms until the next status transition / decay drop, or null. */
  remainingMs: number | null;
  /** Absolute epoch ms of the next transition (restEnd / windowEnd / next decay drop), or null. */
  nextEventAt: number | null;
  consecutiveRestViolations: number;
  /** Duration of the currently active rest period (post extensions), or null. */
  activeRestDurationMs: number | null;
}
