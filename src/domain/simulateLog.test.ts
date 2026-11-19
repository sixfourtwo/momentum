import { describe, expect, it } from 'vitest';
import { HOUR } from '../config/categoryConfig';
import { simulateLog } from './simulateLog';
import type { WorkoutLog } from '../types';

const T0 = 1_700_000_000_000;

function log(
  category: WorkoutLog['category'],
  difficulty: WorkoutLog['difficulty'],
  timestamp: number,
): WorkoutLog {
  return {
    id: `log-${timestamp}-${difficulty}`,
    category,
    timestamp,
    durationMinutes: 30,
    difficulty,
    createdAt: timestamp,
  };
}

const candidate = (
  category: WorkoutLog['category'],
  difficulty: WorkoutLog['difficulty'],
  timestamp: number,
) => ({ category, difficulty, timestamp, durationMinutes: 30 });

describe('simulateLog', () => {
  it('previews a normal gain in the Workout Window', () => {
    // Strength moderate: rest ends T0+36h → log at T0+40h is inside the window.
    const logs = [log('strength', 'moderate', T0)];
    const preview = simulateLog(0, logs, candidate('strength', 'moderate', T0 + 40 * HOUR));
    expect(preview.statusBefore).toBe('window');
    expect(preview.delta).toBe(10);
    expect(preview.restMs).toBe(36 * HOUR);
    expect(preview.message).toBe('Rest: 1d 12h · +10% progress');
    expect(preview.tone).toBe('positive');
  });

  it('previews active recovery for Light during Rest', () => {
    const logs = [log('strength', 'moderate', T0)];
    const preview = simulateLog(0, logs, candidate('strength', 'light', T0 + 10 * HOUR));
    expect(preview.statusBefore).toBe('rest');
    expect(preview.delta).toBe(0);
    expect(preview.message).toBe('Active Recovery · No penalty, rest continues');
    expect(preview.tone).toBe('neutral');
  });

  it('warns about the first Moderate violation and its extended reset', () => {
    const logs = [log('strength', 'moderate', T0)];
    const preview = simulateLog(0, logs, candidate('strength', 'moderate', T0 + 10 * HOUR));
    expect(preview.delta).toBe(0);
    expect(preview.restMs).toBe(45 * HOUR); // 36h × 1.25
    expect(preview.message).toBe('Still resting — progress stalled · Rest resets to 1d 21h');
    expect(preview.tone).toBe('warning');
  });

  it('escalates a Hard 2nd violation to a danger preview', () => {
    const logs = [
      log('strength', 'hard', T0),
      log('strength', 'hard', T0 + 5 * HOUR),
    ];
    // initial 100 keeps the score clear of the 0 floor so the full penalty shows.
    const preview = simulateLog(100, logs, candidate('strength', 'hard', T0 + 30 * HOUR));
    expect(preview.delta).toBe(-10);
    expect(preview.restMs).toBe(120 * HOUR); // 60h × 2.0
    expect(preview.message).toBe('Still resting! -10% progress · Rest resets to 5d');
    expect(preview.tone).toBe('danger');
  });

  it('shows the spec example: Hard strength during rest resets to 3d 18h', () => {
    const logs = [log('strength', 'moderate', T0)];
    const preview = simulateLog(0, logs, candidate('strength', 'hard', T0 + 10 * HOUR));
    expect(preview.delta).toBe(-5);
    expect(preview.restMs).toBe(90 * HOUR); // 60h × 1.5
    expect(preview.message).toBe('Still resting! -5% progress · Rest resets to 3d 18h');
    expect(preview.tone).toBe('danger');
  });

  it('stays neutral and non-punitive for mindfulness during rest', () => {
    const logs = [log('mindfulness', 'moderate', T0)];
    const preview = simulateLog(0, logs, candidate('mindfulness', 'hard', T0 + 2 * HOUR));
    expect(preview.delta).toBe(0);
    expect(preview.restMs).toBe(16 * HOUR); // longer base rest extends the timer
    expect(preview.message).toBe('No penalty · Rest extends to 16h · Give the mind time to integrate');
    expect(preview.tone).toBe('neutral');
  });

  it('keeps the timer message when the base rest is shorter', () => {
    const logs = [log('mindfulness', 'moderate', T0)];
    const preview = simulateLog(0, logs, candidate('mindfulness', 'light', T0 + HOUR));
    expect(preview.message).toBe('No penalty · Rest continues');
  });

  it('celebrates recovery from a missed window', () => {
    // Strength moderate: windowEnd T0+96h; log again at +120h (missed).
    const logs = [log('strength', 'moderate', T0)];
    const preview = simulateLog(0, logs, candidate('strength', 'moderate', T0 + 120 * HOUR));
    expect(preview.statusBefore).toBe('missed');
    expect(preview.delta).toBe(10); // −10 decay applied to both runs, so net gain
    expect(preview.message).toBe('Back on track! Rest: 1d 12h · +10% progress');
    expect(preview.tone).toBe('positive');
  });

  it('ignores other categories\u2019 logs when simulating', () => {
    const logs = [log('cardio', 'hard', T0 + HOUR)];
    const preview = simulateLog(0, logs, candidate('strength', 'moderate', T0 + 2 * HOUR));
    expect(preview.statusBefore).toBe('ready');
    expect(preview.delta).toBe(10);
  });
});
