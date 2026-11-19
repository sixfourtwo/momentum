import type { CategoryState, WorkoutCategory, WorkoutDifficulty, WorkoutLog } from '../types';
import {
  GAIN_POINTS,
  MAX_SCORE,
  MISS_PENALTY,
  TIMING_MATRIX,
  levelForScore,
  levelNameForScore,
  ringPercentForScore,
  violationPenalty,
  violationRestMultiplier,
} from '../config/categoryConfig';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampScore = (value: number) => clamp(value, 0, MAX_SCORE);

/**
 * One training cycle: a workout triggers Rest, then a Workout Window, then decay.
 * `restDuration` is the active (possibly extended) rest duration; the depleting
 * bar scales against it from `restStart`.
 */
interface Cycle {
  category: WorkoutCategory;
  restStart: number;
  restDuration: number;
  restEnd: number;
  windowDuration: number;
  windowEnd: number;
}

function startCycle(log: WorkoutLog): Cycle {
  const timers = TIMING_MATRIX[log.category].timers[log.difficulty];
  return {
    category: log.category,
    restStart: log.timestamp,
    restDuration: timers.rest,
    restEnd: log.timestamp + timers.rest,
    windowDuration: timers.window,
    windowEnd: log.timestamp + timers.rest + timers.window,
  };
}

/** Number of −10 decay drops that have fired by time `t` (immediate drop at windowEnd). */
export function missedDecayDrops(windowEnd: number, t: number, interval: number): number {
  if (t <= windowEnd) return 0;
  return 1 + Math.floor((t - windowEnd) / interval);
}

export function nextDropAt(windowEnd: number, t: number, interval: number): number {
  return windowEnd + missedDecayDrops(windowEnd, t, interval) * interval;
}

/**
 * Pure, deterministic category-state replay (spec §2 "Deterministic State Derivation").
 *
 * Starts at `initialScore`, replays the category's chronologically sorted logs,
 * and derives every timer/level value from timestamps — no background timers.
 * Logs dated in the future relative to `now` are ignored (clock-skew guard).
 */
export function calculateCategoryState(
  initialScore: number,
  logs: WorkoutLog[],
  now: number,
): CategoryState {
  const sorted = logs
    .filter((log) => log.timestamp <= now)
    .sort((a, b) => a.timestamp - b.timestamp || a.createdAt - b.createdAt);

  let score = clampScore(initialScore);
  let violations = 0;
  let cycle: Cycle | null = null;

  const baseState = (over: Partial<CategoryState>): CategoryState => ({
    totalScore: score,
    level: levelForScore(score),
    levelName: levelNameForScore(score),
    ringPercent: ringPercentForScore(score),
    status: 'ready',
    barFillPercent: null,
    remainingMs: null,
    nextEventAt: null,
    consecutiveRestViolations: 0,
    activeRestDurationMs: null,
    ...over,
  });

  for (const log of sorted) {
    if (cycle) {
      // Apply any Missed-window decay that accumulated before this new log.
      const drops = missedDecayDrops(
        cycle.windowEnd,
        log.timestamp,
        TIMING_MATRIX[cycle.category].decayInterval,
      );
      if (drops > 0) score = clampScore(score - drops * MISS_PENALTY);

      if (log.timestamp < cycle.restEnd) {
        // Logged while still resting.
        if (log.category === 'mindfulness') {
          // No penalties, no violation counting; the timer only moves if the
          // new session's base rest is longer than the existing one.
          const timers = TIMING_MATRIX[log.category].timers[log.difficulty];
          if (log.timestamp + timers.rest > cycle.restEnd) {
            cycle = startCycle(log);
          }
        } else if (log.difficulty === 'light') {
          // Active recovery: neutral, current rest countdown continues untouched.
        } else {
          violations += 1;
          score = clampScore(score + violationPenalty(log.difficulty, violations));
          const timers = TIMING_MATRIX[log.category].timers[log.difficulty];
          const duration =
            timers.rest * violationRestMultiplier(log.difficulty, violations);
          cycle = {
            category: log.category,
            restStart: log.timestamp,
            restDuration: duration,
            restEnd: log.timestamp + duration,
            windowDuration: timers.window,
            windowEnd: log.timestamp + duration + timers.window,
          };
        }
        continue;
      }

      // Logged during Workout Window or Missed: normal gain, violation streak resets.
      violations = 0;
      score = clampScore(score + GAIN_POINTS[log.difficulty]);
      cycle = startCycle(log);
    } else {
      // First workout in the category exits Ready with a normal gain.
      score = clampScore(score + GAIN_POINTS[log.difficulty]);
      cycle = startCycle(log);
    }
  }

  if (!cycle) {
    return baseState({ status: 'ready' });
  }

  if (now < cycle.restEnd) {
    const fill = clamp(100 * (1 - (now - cycle.restStart) / cycle.restDuration), 0, 100);
    return baseState({
      status: 'rest',
      barFillPercent: fill,
      remainingMs: cycle.restEnd - now,
      nextEventAt: cycle.restEnd,
      consecutiveRestViolations: violations,
      activeRestDurationMs: cycle.restDuration,
    });
  }

  if (now <= cycle.windowEnd) {
    const fill = clamp(100 * (1 - (now - cycle.restEnd) / cycle.windowDuration), 0, 100);
    return baseState({
      status: 'window',
      barFillPercent: fill,
      remainingMs: cycle.windowEnd - now,
      nextEventAt: cycle.windowEnd,
    });
  }

  // Missed: immediate −10 at windowEnd, then −10 per elapsed decay interval.
  const interval = TIMING_MATRIX[cycle.category].decayInterval;
  const drops = missedDecayDrops(cycle.windowEnd, now, interval);
  score = clampScore(score - drops * MISS_PENALTY);
  const nextDrop = cycle.windowEnd + drops * interval;
  const intervalStart = nextDrop - interval;
  const fill = clamp(100 * (1 - (now - intervalStart) / interval), 0, 100);
  return baseState({
    status: 'missed',
    barFillPercent: fill,
    remainingMs: nextDrop - now,
    nextEventAt: nextDrop,
  });
}
