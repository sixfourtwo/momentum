import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import { IndexedDBStrategy } from './IndexedDBStrategy';
import { InMemoryStrategy } from './InMemoryStrategy';
import { LocalStorageStrategy } from './LocalStorageStrategy';
import type { StorageStrategy } from './StorageStrategy';

const DB_NAME = 'momentum-contract-test';

interface StrategyFactory {
  label: string;
  create: () => StorageStrategy;
  persistsAcrossInstances: boolean;
}

const factories: StrategyFactory[] = [
  { label: 'InMemoryStrategy', create: () => new InMemoryStrategy(), persistsAcrossInstances: false },
  {
    label: 'LocalStorageStrategy',
    create: () => new LocalStorageStrategy('momentum-contract-test'),
    persistsAcrossInstances: true,
  },
  { label: 'IndexedDBStrategy', create: () => new IndexedDBStrategy(DB_NAME), persistsAcrossInstances: true },
];

function item(id: string, value: string) {
  return { id, value };
}

function workout(id: string, timestamp: number): WorkoutLog {
  return {
    id,
    category: 'strength',
    timestamp,
    durationMinutes: 30,
    difficulty: 'moderate',
    createdAt: timestamp,
  };
}

describe.each(factories)('StorageStrategy contract — $label', ({ create, persistsAcrossInstances }) => {
  let strategy: StorageStrategy;

  beforeEach(async () => {
    if (create().name === 'LocalStorageStrategy') {
      localStorage.clear();
    }
    strategy = create();
    await strategy.clear('logs');
    await strategy.clear('profile');
  });

  it('returns an empty list for an unknown collection', async () => {
    expect(await strategy.getAll('logs')).toEqual([]);
  });

  it('put + getById round-trips an item', async () => {
    await strategy.put('logs', item('a', 'alpha'));
    expect(await strategy.getById('logs', 'a')).toEqual(item('a', 'alpha'));
  });

  it('returns undefined for a missing id', async () => {
    expect(await strategy.getById('logs', 'nope')).toBeUndefined();
  });

  it('getAll returns every item in the collection', async () => {
    await strategy.put('logs', item('a', 'alpha'));
    await strategy.put('logs', item('b', 'beta'));
    const all = await strategy.getAll('logs');
    expect(all).toHaveLength(2);
    expect(all.map((entry) => (entry as { id: string }).id).sort()).toEqual(['a', 'b']);
  });

  it('overwrites an item with the same id', async () => {
    await strategy.put('logs', item('a', 'first'));
    await strategy.put('logs', item('a', 'second'));
    expect(await strategy.getById('logs', 'a')).toEqual(item('a', 'second'));
    expect(await strategy.getAll('logs')).toHaveLength(1);
  });

  it('keeps collections isolated', async () => {
    await strategy.put('logs', item('a', 'log'));
    await strategy.put('profile', item('default_profile', 'profile'));
    expect(await strategy.getAll('logs')).toEqual([item('a', 'log')]);
    expect(await strategy.getById('profile', 'default_profile')).toEqual(
      item('default_profile', 'profile'),
    );
  });

  it('delete removes a single item', async () => {
    await strategy.put('logs', item('a', 'alpha'));
    await strategy.put('logs', item('b', 'beta'));
    await strategy.delete('logs', 'a');
    expect(await strategy.getById('logs', 'a')).toBeUndefined();
    expect(await strategy.getAll('logs')).toEqual([item('b', 'beta')]);
  });

  it('clear empties the collection but leaves others intact', async () => {
    await strategy.put('logs', item('a', 'alpha'));
    await strategy.put('profile', item('default_profile', 'profile'));
    await strategy.clear('logs');
    expect(await strategy.getAll('logs')).toEqual([]);
    expect(await strategy.getById('profile', 'default_profile')).toBeDefined();
  });

  it('handles structured objects (WorkoutLog) without mutation', async () => {
    const entry = workout('w1', 1234567890);
    await strategy.put('logs', entry);
    const fetched = await strategy.getById<WorkoutLog>('logs', 'w1');
    expect(fetched).toEqual(entry);
  });

  it(
    persistsAcrossInstances
      ? 'persists data across driver instances'
      : 'does not persist data across driver instances',
    async () => {
      await strategy.put('logs', item('persist', 'yes'));
      const fresh = create();
      const fetched = await fresh.getById('logs', 'persist');
      if (persistsAcrossInstances) {
        expect(fetched).toEqual(item('persist', 'yes'));
      } else {
        expect(fetched).toBeUndefined();
      }
    },
  );
});
