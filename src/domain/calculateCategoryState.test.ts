import { describe, expect, it } from 'vitest';
import { DAY, HOUR, MAX_SCORE } from '../config/categoryConfig';
import { calculateCategoryState } from './calculateCategoryState';

let seq = 0;
function log(
  category: 'strength' | 'cardio' | 'mindfulness',
  difficulty: 'light' | 'moderate' | 'hard',
  timestamp: number,
): { id: string; category: 'strength' | 'cardio' | 'mindfulness'; timestamp: number; durationMinutes: number; difficulty: 'light' | 'moderate' | 'hard'; createdAt: number } {
  seq += 1;
  return {
    id: `log-${seq}`,
    category,
    timestamp,
    durationMinutes: 30,
    difficulty,
    createdAt: timestamp,
  };
}

const T0 = 1_700_000_000_000;

describe('calculateCategoryState — ready state', () => {
  it('starts at the initial score with no timers before the first log', () => {
    const state = calculateCategoryState(140, [], T0 + 5 * DAY);
    expect(state.status).toBe('ready');
    expect(state.totalScore).toBe(140);
    expect(state.level).toBe(2);
    expect(state.levelName).toBe('Building');
    expect(state.ringPercent).toBe(40);
    expect(state.barFillPercent).toBeNull();
    expect(state.remainingMs).toBeNull();
    expect(state.consecutiveRestViolations).toBe(0);
    expect(state.activeRestDurationMs).toBeNull();
  });

  it('clamps initial scores into 0–600', () => {
    expect(calculateCategoryState(-50, [], T0).totalScore).toBe(0);
    expect(calculateCategoryState(900, [], T0).totalScore).toBe(MAX_SCORE);
  });

  it('ignores logs dated in the future relative to now', () => {
    const state = calculateCategoryState(0, [log('strength', 'moderate', T0 + HOUR)], T0);
    expect(state.status).toBe('ready');
    expect(state.totalScore).toBe(0);
  });
});

describe('calculateCategoryState — level math', () => {
  it.each([
    [0, 1, 0],
    [99, 1, 99],
    [100, 2, 0],
    [140, 2, 40],
    [205, 3, 5],
    [599, 6, 99],
    [600, 6, 100],
  ])('score %i → level %i, ring %i%%', (score, level, ring) => {
    const state = calculateCategoryState(score, [], T0);
    expect(state.level).toBe(level);
    expect(state.ringPercent).toBe(ring);
  });

  it('rolls over: 195 + 10 lands at Level 3, 5%', () => {
    const state = calculateCategoryState(195, [log('strength', 'moderate', T0)], T0);
    expect(state.totalScore).toBe(205);
    expect(state.level).toBe(3);
    expect(state.levelName).toBe('Capable');
    expect(state.ringPercent).toBe(5);
  });

  it('caps gains at 600 / Level 6 / 100%', () => {
    const state = calculateCategoryState(590, [log('strength', 'hard', T0)], T0);
    expect(state.totalScore).toBe(MAX_SCORE);
    expect(state.level).toBe(6);
    expect(state.levelName).toBe('Peak');
    expect(state.ringPercent).toBe(100);
  });

  it('demotes smoothly: 205 − 10 lands back at Level 2, 95%', () => {
    // Moderate strength: rest 36h, window 60h → windowEnd = T0 + 96h.
    const missedAt = T0 + 96 * HOUR + 1;
    const state = calculateCategoryState(195, [log('strength', 'moderate', T0)], missedAt);
    expect(state.status).toBe('missed');
    expect(state.totalScore).toBe(195);
    expect(state.level).toBe(2);
    expect(state.levelName).toBe('Building');
    expect(state.ringPercent).toBe(95);
  });
});

describe('calculateCategoryState — rest → window → missed cycle', () => {
  it('shows a depleting rest bar after the first log', () => {
    // Strength light: rest 24h, gain +6.
    const state = calculateCategoryState(0, [log('strength', 'light', T0)], T0 + HOUR);
    expect(state.status).toBe('rest');
    expect(state.totalScore).toBe(6);
    expect(state.remainingMs).toBe(23 * HOUR);
    expect(state.activeRestDurationMs).toBe(24 * HOUR);
    expect(state.barFillPercent).toBeCloseTo((1 - 1 / 24) * 100, 5);
    expect(state.nextEventAt).toBe(T0 + 24 * HOUR);
  });

  it('transitions to Workout Window exactly at restEnd and depletes over the window', () => {
    // Strength moderate: rest 36h, window 60h.
    const state = calculateCategoryState(0, [log('strength', 'moderate', T0)], T0 + 36 * HOUR);
    expect(state.status).toBe('window');
    expect(state.totalScore).toBe(10);
    expect(state.barFillPercent).toBeCloseTo(100, 5);
    expect(state.remainingMs).toBe(60 * HOUR);
    expect(state.consecutiveRestViolations).toBe(0);

    const later = calculateCategoryState(0, [log('strength', 'moderate', T0)], T0 + 36 * HOUR + 30 * HOUR);
    expect(later.status).toBe('window');
    expect(later.barFillPercent).toBeCloseTo(50, 5);
    expect(later.remainingMs).toBe(30 * HOUR);
  });

  it('applies the immediate −10 the moment the window expires', () => {
    const at = T0 + 96 * HOUR + 1;
    const state = calculateCategoryState(100, [log('strength', 'moderate', T0)], at);
    expect(state.status).toBe('missed');
    expect(state.totalScore).toBe(100); // 100 + 10 − 10
    expect(state.barFillPercent).toBeCloseTo(100, 3);
    expect(state.remainingMs).toBe(5 * DAY - 1);
    expect(state.nextEventAt).toBe(at - 1 + 5 * DAY);
  });

  it('still counts as window at exactly windowEnd (no penalty)', () => {
    const state = calculateCategoryState(100, [log('strength', 'moderate', T0)], T0 + 96 * HOUR);
    expect(state.status).toBe('window');
    expect(state.totalScore).toBe(110);
  });
});

describe('calculateCategoryState — missed decay', () => {
  it('deducts −10 per decay interval (strength: 5d) with the bar resetting each drop', () => {
    const windowEnd = T0 + 96 * HOUR;
    const at = windowEnd + 240 * HOUR; // 2 full intervals after the immediate drop
    const state = calculateCategoryState(100, [log('strength', 'moderate', T0)], at);
    // drops = 1 + floor(240/120) = 3 → 110 − 30 = 80.
    expect(state.totalScore).toBe(80);
    expect(state.level).toBe(1);
    expect(state.ringPercent).toBe(80);
    expect(state.barFillPercent).toBeCloseTo(100, 5); // 3rd drop just fired, bar reset
    expect(state.remainingMs).toBe(5 * DAY);
  });

  it('shows a partially depleted bar between drops', () => {
    const windowEnd = T0 + 96 * HOUR;
    const at = windowEnd + 24 * HOUR; // a fifth of the way to the next drop
    const state = calculateCategoryState(100, [log('strength', 'moderate', T0)], at);
    expect(state.totalScore).toBe(100); // only the immediate −10 so far: 110 − 10
    expect(state.barFillPercent).toBeCloseTo(80, 5);
    expect(state.remainingMs).toBe(4 * DAY);
  });

  it('floors the score at 0 during prolonged decay', () => {
    const windowEnd = T0 + 96 * HOUR;
    const at = windowEnd + 400 * DAY;
    const state = calculateCategoryState(100, [log('strength', 'moderate', T0)], at);
    expect(state.totalScore).toBe(0);
    expect(state.level).toBe(1);
    expect(state.ringPercent).toBe(0);
  });

  it('uses the 3-day decay interval for cardio and mindfulness', () => {
    const cardioEnd = T0 + 72 * HOUR; // cardio moderate: rest 24h + window 48h
    const state = calculateCategoryState(100, [log('cardio', 'moderate', T0)], cardioEnd + 72 * HOUR + 1);
    expect(state.status).toBe('missed');
    expect(state.totalScore).toBe(90); // 110 − 10 − 10 (one full extra interval)
    expect(state.remainingMs).toBe(3 * DAY - 1);
  });
});

describe('calculateCategoryState — overtraining during rest (strength/cardio)', () => {
  it('treats Light during Rest as active recovery: no points, timer untouched', () => {
    const logs = [log('strength', 'moderate', T0), log('strength', 'light', T0 + 10 * HOUR)];
    const state = calculateCategoryState(0, logs, T0 + 20 * HOUR);
    expect(state.status).toBe('rest');
    expect(state.totalScore).toBe(10);
    expect(state.consecutiveRestViolations).toBe(0);
    expect(state.activeRestDurationMs).toBe(36 * HOUR); // unchanged base rest
    expect(state.remainingMs).toBe(16 * HOUR); // restEnd still T0+36h
  });

  it('1st Moderate violation: 0 pts, rest resets to base × 1.25', () => {
    const logs = [log('strength', 'moderate', T0), log('strength', 'moderate', T0 + 10 * HOUR)];
    const state = calculateCategoryState(0, logs, T0 + 20 * HOUR);
    expect(state.totalScore).toBe(10);
    expect(state.consecutiveRestViolations).toBe(1);
    expect(state.activeRestDurationMs).toBe(45 * HOUR); // 36h × 1.25
    expect(state.remainingMs).toBe(35 * HOUR); // restEnd = T0 + 10h + 45h
  });

  it('2nd+ Moderate violations: −5 each, rest resets to base × (1 + 0.35v)', () => {
    const logs = [
      log('strength', 'moderate', T0),
      log('strength', 'moderate', T0 + 10 * HOUR),
      log('strength', 'moderate', T0 + 20 * HOUR),
    ];
    const state = calculateCategoryState(0, logs, T0 + 30 * HOUR);
    expect(state.totalScore).toBe(5); // 10 + 0 − 5
    expect(state.consecutiveRestViolations).toBe(2);
    expect(state.activeRestDurationMs).toBeCloseTo(36 * 1.7 * HOUR, 3); // 61.2h
    expect(state.remainingMs).toBeCloseTo(T0 + 20 * HOUR + 61.2 * HOUR - (T0 + 30 * HOUR), 3);
  });

  it('caps the moderate multiplier at 2.25×', () => {
    const logs = [
      log('strength', 'moderate', T0),
      log('strength', 'moderate', T0 + HOUR),
      log('strength', 'moderate', T0 + 2 * HOUR),
      log('strength', 'moderate', T0 + 3 * HOUR),
      log('strength', 'moderate', T0 + 4 * HOUR),
    ];
    const state = calculateCategoryState(0, logs, T0 + 5 * HOUR);
    expect(state.consecutiveRestViolations).toBe(4);
    expect(state.activeRestDurationMs).toBe(36 * 2.25 * HOUR); // capped
  });

  it('escalates Hard violations: −5, −10, −15 with ×1.5 → ×2.5 cap', () => {
    const logs = [
      log('strength', 'hard', T0),
      log('strength', 'hard', T0 + 5 * HOUR),
      log('strength', 'hard', T0 + 30 * HOUR),
      log('strength', 'hard', T0 + 60 * HOUR),
      log('strength', 'hard', T0 + 100 * HOUR),
    ];
    const state = calculateCategoryState(0, logs, T0 + 110 * HOUR);
    // 13 − 5 − 10 − 15 − 15 = −32 → floored at 0.
    expect(state.totalScore).toBe(0);
    expect(state.consecutiveRestViolations).toBe(4);
    expect(state.activeRestDurationMs).toBe(60 * 2.5 * HOUR);
    expect(state.remainingMs).toBe(T0 + 100 * HOUR + 150 * HOUR - (T0 + 110 * HOUR));
  });

  it('floors the score at 0 while violations stack', () => {
    // 13 (hard) − 5 (violation #1) − 10 (violation #2) → clamped to 0.
    const logs = [
      log('strength', 'hard', T0),
      log('strength', 'hard', T0 + HOUR),
      log('strength', 'hard', T0 + 2 * HOUR),
    ];
    const state = calculateCategoryState(0, logs, T0 + 3 * HOUR);
    expect(state.totalScore).toBe(0);
  });

  it('resets the violation streak after a full rest completes, then logs normally', () => {
    const logs = [
      log('strength', 'moderate', T0),
      log('strength', 'moderate', T0 + 10 * HOUR), // violation #1, rest now 45h → ends T0+55h
      log('strength', 'light', T0 + 60 * HOUR), // window phase → +6, streak resets
      log('strength', 'moderate', T0 + 80 * HOUR), // violation #1 again (fresh streak)
    ];
    const state = calculateCategoryState(0, logs, T0 + 90 * HOUR);
    expect(state.status).toBe('rest');
    expect(state.totalScore).toBe(16); // 10 + 6 + 0
    expect(state.consecutiveRestViolations).toBe(1);
    expect(state.activeRestDurationMs).toBe(45 * HOUR);
    expect(state.remainingMs).toBe(T0 + 80 * HOUR + 45 * HOUR - (T0 + 90 * HOUR));
  });
});

describe('calculateCategoryState — mindfulness during rest', () => {
  it('never penalizes and only extends when the new base rest is longer', () => {
    const logs = [
      log('mindfulness', 'moderate', T0), // rest 8h, +10
      log('mindfulness', 'hard', T0 + 2 * HOUR), // base rest 16h > remaining → extends
    ];
    const state = calculateCategoryState(0, logs, T0 + 5 * HOUR);
    expect(state.status).toBe('rest');
    expect(state.totalScore).toBe(10);
    expect(state.consecutiveRestViolations).toBe(0);
    expect(state.activeRestDurationMs).toBe(16 * HOUR);
    expect(state.remainingMs).toBe(13 * HOUR); // restEnd = T0 + 2h + 16h
    expect(state.nextEventAt).toBe(T0 + 18 * HOUR);
  });

  it('keeps the existing timer when the new base rest is shorter', () => {
    const logs = [
      log('mindfulness', 'moderate', T0), // rest 8h
      log('mindfulness', 'light', T0 + HOUR), // base rest 4h → T0+5h < T0+8h
    ];
    const state = calculateCategoryState(0, logs, T0 + 2 * HOUR);
    expect(state.totalScore).toBe(10);
    expect(state.activeRestDurationMs).toBe(8 * HOUR);
    expect(state.remainingMs).toBe(6 * HOUR);
    expect(state.nextEventAt).toBe(T0 + 8 * HOUR);
  });
});

describe('calculateCategoryState — recovery and replay', () => {
  it('exits Missed with a normal gain, after applying decay up to the log time', () => {
    // Moderate strength: windowEnd T0+96h. New moderate log at +226h → 2 drops (−20), then +10.
    const logs = [log('strength', 'moderate', T0), log('strength', 'moderate', T0 + 226 * HOUR)];
    const state = calculateCategoryState(0, logs, T0 + 230 * HOUR);
    expect(state.status).toBe('rest');
    expect(state.totalScore).toBe(10); // 10 − 20 → 0 (floored), +10
    expect(state.consecutiveRestViolations).toBe(0);
    expect(state.activeRestDurationMs).toBe(36 * HOUR);
    expect(state.remainingMs).toBe(32 * HOUR);
  });

  it('derives identical state regardless of input log order', () => {
    const a = log('strength', 'moderate', T0);
    const b = log('strength', 'light', T0 + 48 * HOUR);
    const c = log('strength', 'hard', T0 + 80 * HOUR);
    const shuffled = [c, a, b];
    expect(calculateCategoryState(0, shuffled, T0 + 90 * HOUR)).toEqual(
      calculateCategoryState(0, [a, b, c], T0 + 90 * HOUR),
    );
  });

  it('recomputes deterministically when a backdated log lands inside an earlier rest', () => {
    const withoutBackdate = [log('strength', 'moderate', T0), log('strength', 'light', T0 + 48 * HOUR)];
    const withBackdate = [
      log('strength', 'moderate', T0),
      log('strength', 'moderate', T0 + 10 * HOUR), // violation inside the first rest
      log('strength', 'light', T0 + 48 * HOUR), // now falls inside the extended rest → active recovery
    ];
    const expected = calculateCategoryState(0, withBackdate, T0 + 50 * HOUR);
    expect(expected.totalScore).toBe(10);
    expect(expected.consecutiveRestViolations).toBe(1);
    // Sanity: the version without the backdated log differs (16 pts, later restEnd).
    const naive = calculateCategoryState(0, withoutBackdate, T0 + 50 * HOUR);
    expect(naive.totalScore).toBe(16);
    expect(naive.activeRestDurationMs).toBe(24 * HOUR);
  });

  it('survives a 10-day gap (US-3.5 drift)', () => {
    // Moderate strength at T0 → windowEnd T0+96h. Reopen at T0+240h:
    // drops = 1 + floor(144/120) = 2 → 110 − 20 = 90 → Level 1, 90%.
    const state = calculateCategoryState(100, [log('strength', 'moderate', T0)], T0 + 240 * HOUR);
    expect(state.status).toBe('missed');
    expect(state.totalScore).toBe(90);
    expect(state.level).toBe(1);
    expect(state.ringPercent).toBe(90);
    expect(state.barFillPercent).toBeCloseTo(80, 5);
    expect(state.remainingMs).toBe(96 * HOUR);
    expect(state.nextEventAt).toBe(T0 + 336 * HOUR);
  });
});
