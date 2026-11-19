import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { FitnessProfile, WorkoutLog } from '../types';
import { AppRepository } from './AppRepository';
import { IndexedDBStrategy } from './IndexedDBStrategy';
import { LocalStorageStrategy } from './LocalStorageStrategy';
import type { StorageStrategy } from './StorageStrategy';

export interface AppData {
  profile: FitnessProfile | undefined;
  logs: WorkoutLog[];
  hydrated: boolean;
}

interface RepositoryContextValue {
  repository: AppRepository;
  strategyName: string;
  swapStrategy: (strategy: StorageStrategy) => void;
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function createDefaultStrategy(): StorageStrategy {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDBStrategy();
  }
  return new LocalStorageStrategy();
}

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repositoryRef = useRef<AppRepository | null>(null);
  if (!repositoryRef.current) {
    repositoryRef.current = new AppRepository(createDefaultStrategy());
  }
  const repository = repositoryRef.current;

  const [strategyName, setStrategyName] = useState(() => repository.getStrategyName());

  const swapStrategy = useCallback(
    (strategy: StorageStrategy) => {
      repository.setStrategy(strategy);
      setStrategyName(strategy.name);
    },
    [repository],
  );

  const value = useMemo(
    () => ({ repository, strategyName, swapStrategy }),
    [repository, strategyName, swapStrategy],
  );

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useAppRepository(): RepositoryContextValue {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useAppRepository must be used inside <RepositoryProvider>');
  }
  return context;
}

const EMPTY_LOGS: WorkoutLog[] = [];

/**
 * Subscribes the UI to the repository's synchronous snapshot via
 * `useSyncExternalStore`. Mutations update the snapshot in the same tick as
 * the write, so the dashboard re-renders immediately — the async `hydrate()`
 * only runs on mount, strategy swaps and cross-tab messages.
 * Falls back to LocalStorage if the default driver fails on mount.
 */
export function useAppData(): AppData & { reload: () => Promise<void> } {
  const { repository, swapStrategy, strategyName } = useAppRepository();

  const profile = useSyncExternalStore(
    repository.subscribe,
    () => repository.getProfileSnapshot(),
    () => undefined,
  );
  const logs = useSyncExternalStore(
    repository.subscribe,
    () => repository.getLogsSnapshot(),
    () => EMPTY_LOGS,
  );
  const hydrated = useSyncExternalStore(repository.subscribe, () => repository.isHydrated(), () => false);

  useEffect(() => {
    let alive = true;
    repository.hydrate().catch(() => {
      if (!alive) return;
      swapStrategy(new LocalStorageStrategy());
      void repository.hydrate().catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, [repository, swapStrategy, strategyName]);

  return { profile, logs, hydrated, reload: () => repository.hydrate() };
}
