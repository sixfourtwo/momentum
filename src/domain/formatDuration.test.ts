import { describe, expect, it } from 'vitest';
import { DAY, HOUR, MINUTE } from '../config/categoryConfig';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it.each([
    [0, '0h'],
    [-5000, '0h'],
    [30 * MINUTE, 'under 1h'],
    [59 * MINUTE, 'under 1h'],
    [60 * MINUTE, '1h'],
    [16 * HOUR + 59 * MINUTE, '17h'],
    [23 * HOUR, '23h'],
    [24 * HOUR, '1d'],
    [48 * HOUR, '2d'],
    [62 * HOUR + 29 * MINUTE, '2d 15h'],
    [36 * HOUR, '1d 12h'],
    [25 * DAY, '25d'],
  ])('%s ms → "%s"', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('rounds up so 0h never shows while time remains', () => {
    expect(formatDuration(90 * MINUTE + 1)).toBe('2h');
    expect(formatDuration(24 * HOUR + 1)).toBe('1d 1h');
  });
});
