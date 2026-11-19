import type { CategoryStatus, WorkoutCategory, WorkoutDifficulty, WorkoutLog } from '../types';
import { calculateCategoryState } from './calculateCategoryState';
import { formatDuration } from './formatDuration';

export type PreviewTone = 'positive' | 'neutral' | 'warning' | 'danger';

export interface LogPreview {
  /** Score delta this log will apply. */
  delta: number;
  /** Rest duration that will be in effect right after logging (ms). */
  restMs: number;
  /** Human-readable outcome, e.g. "Rest: 1d 12h · +10% progress". */
  message: string;
  tone: PreviewTone;
  /** Status the category was in before this log. */
  statusBefore: CategoryStatus;
}

export interface CandidateLog {
  category: WorkoutCategory;
  timestamp: number;
  durationMinutes: number;
  difficulty: WorkoutDifficulty;
}

/**
 * Outcome preview for the Log Workout Sheet, derived by running the same
 * deterministic engine with the hypothetical log appended — the preview can
 * never drift from the real scoring rules.
 */
export function simulateLog(
  initialScore: number,
  allLogs: WorkoutLog[],
  candidate: CandidateLog,
): LogPreview {
  const logs = allLogs.filter((log) => log.category === candidate.category);
  const before = calculateCategoryState(initialScore, logs, candidate.timestamp);
  const candidateLog: WorkoutLog = {
    id: 'preview',
    createdAt: candidate.timestamp,
    ...candidate,
  };
  const after = calculateCategoryState(initialScore, [...logs, candidateLog], candidate.timestamp);

  const delta = after.totalScore - before.totalScore;
  const restMs = after.activeRestDurationMs ?? 0;
  const restLabel = formatDuration(restMs);

  let message: string;
  let tone: PreviewTone;

  if (before.status === 'rest' && candidate.category !== 'mindfulness') {
    if (candidate.difficulty === 'light') {
      message = 'Active Recovery · No penalty, rest continues';
      tone = 'neutral';
    } else if (delta < 0) {
      message = `Still resting! ${delta}% progress · Rest resets to ${restLabel}`;
      tone = 'danger';
    } else {
      message = `Still resting — progress stalled · Rest resets to ${restLabel}`;
      tone = 'warning';
    }
  } else if (before.status === 'rest') {
    // Mindfulness during rest: neutral by design.
    const extended = (before.nextEventAt ?? 0) < (after.nextEventAt ?? 0);
    message = extended
      ? `No penalty · Rest extends to ${restLabel}`
      : 'No penalty · Rest continues';
    if (candidate.difficulty === 'hard') {
      message += ' · Give the mind time to integrate';
    }
    tone = 'neutral';
  } else {
    const prefix = before.status === 'missed' ? 'Back on track! ' : '';
    message = `${prefix}Rest: ${restLabel} · +${delta}% progress`;
    tone = 'positive';
  }

  return { delta, restMs, message, tone, statusBefore: before.status };
}
