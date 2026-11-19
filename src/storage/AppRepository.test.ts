import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FitnessProfile, WorkoutLog } from '../types';
import { AppRepository, PROFILE_ID } from './AppRepository';
import { InMemoryStrategy } from './InMemoryStrategy';
import { LocalStorageStrategy } from './LocalStorageStrategy';

function workout(id: string, timestamp: number, category: WorkoutLog['category'] = 'strength'): WorkoutLog {
  return { id, category, timestamp, durationMinutes: 30, difficulty: 'moderate', createdAt: timestamp };
}

function profile(overrides: Partial<FitnessProfile> = {}): FitnessProfile {
  return {
    id: PROFILE_ID,
    onboardingCompleted: true,
    assessedAt: 1000,
    initialScores: { strength: 140, cardio: 140, mindfulness: 20 },
    ...overrides,
  };
}

describe('AppRepository', () => {
  let repository: AppRepository;

  beforeEach(async () => {
    localStorage.clear();
    repository = new AppRepository(new InMemoryStrategy());
  });

  it('round-trips the profile', async () => {
    expect(await repository.getProfile()).toBeUndefined();
    await repository.saveProfile(profile());
    expect(await repository.getProfile()).toEqual(profile());
  });

  it('returns all logs sorted chronologically regardless of insert order', async () => {
    await repository.addLog(workout('late', 3000));
    await repository.addLog(workout('early', 1000));
    await repository.addLog(workout('middle', 2000));
    const logs = await repository.getAllLogs();
    expect(logs.map((log) => log.id)).toEqual(['early', 'middle', 'late']);
  });

  it('filters logs by category', async () => {
    await repository.addLog(workout('s1', 1000, 'strength'));
    await repository.addLog(workout('c1', 2000, 'cardio'));
    await repository.addLog(workout('s2', 3000, 'strength'));
    const strength = await repository.getLogsByCategory('strength');
    expect(strength.map((log) => log.id)).toEqual(['s1', 's2']);
    expect(await repository.getLogsByCategory('mindfulness')).toEqual([]);
  });

  it('deletes a log', async () => {
    await repository.addLog(workout('s1', 1000));
    await repository.deleteLog('s1');
    expect(await repository.getAllLogs()).toEqual([]);
  });

  it('notifies subscribers on mutations', async () => {
    const listener = vi.fn();
    const unsubscribe = repository.onChange(listener);
    await repository.addLog(workout('s1', 1000));
    expect(listener).toHaveBeenCalledTimes(1);
    await repository.saveProfile(profile());
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await repository.deleteLog('s1');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('updates its synchronous snapshot in the same tick as a mutation', async () => {
    // Regression: the UI must never depend on an async re-read after a write.
    await repository.hydrate();
    expect(repository.isHydrated()).toBe(true);
    expect(repository.getLogsSnapshot()).toEqual([]);

    await repository.addLog(workout('a', 1000));
    expect(repository.getLogsSnapshot().map((log) => log.id)).toEqual(['a']);

    await repository.addLog(workout('b', 2000));
    expect(repository.getLogsSnapshot().map((log) => log.id)).toEqual(['a', 'b']);

    await repository.deleteLog('a');
    expect(repository.getLogsSnapshot().map((log) => log.id)).toEqual(['b']);
    expect(await repository.getAllLogs()).toHaveLength(1);
  });

  it('hydrate() marks the repository ready and publishes the snapshot', async () => {
    // A fresh repository over the same underlying store must see persisted
    // data once hydrated — this is what an app restart does.
    const store = new InMemoryStrategy();
    const writer = new AppRepository(store);
    await writer.saveProfile(profile());
    await writer.addLog(workout('s1', 1000));

    const reader = new AppRepository(store);
    expect(reader.isHydrated()).toBe(false);
    expect(reader.getLogsSnapshot()).toEqual([]);
    await reader.hydrate();
    expect(reader.isHydrated()).toBe(true);
    expect(reader.getProfileSnapshot()).toEqual(profile());
    expect(reader.getLogsSnapshot().map((log) => log.id)).toEqual(['s1']);
  });

  it('setStrategy swaps the backend at runtime and reloads data', async () => {
    const original = new InMemoryStrategy();
    repository.setStrategy(original);
    await repository.saveProfile(profile());
    await repository.addLog(workout('s1', 1000));

    const listener = vi.fn();
    repository.onChange(listener);

    repository.setStrategy(new LocalStorageStrategy('momentum-repo-test'));

    // New backend is empty.
    expect(await repository.getProfile()).toBeUndefined();
    expect(await repository.getAllLogs()).toEqual([]);
    expect(listener).toHaveBeenCalled();

    // Swapping back restores the original data.
    repository.setStrategy(original);
    expect(await repository.getProfile()).toEqual(profile());
    expect((await repository.getAllLogs()).map((log) => log.id)).toEqual(['s1']);
  });
});
