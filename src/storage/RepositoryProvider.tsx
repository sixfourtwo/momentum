import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

/**
 * Loads the profile and all logs, re-hydrating on every repository mutation.
 * Falls back to LocalStorage if the default driver fails (e.g. blocked
 * IndexedDB in private-mode Safari).
 */
export function useAppData(): AppData & { reload: () => Promise<void> } {
  const { repository, swapStrategy } = useAppRepository();
  const [data, setData] = useState<AppData>({ profile: undefined, logs: [], hydrated: false });

  const reload = useCallback(async () => {
    const [profile, logs] = await Promise.all([repository.getProfile(), repository.getAllLogs()]);
    setData({ profile, logs, hydrated: true });
  }, [repository]);

  useEffect(() => {
    let cancelled = false;
    let fellBack = false;

    const load = async () => {
      try {
        await reload();
      } catch {
        if (cancelled || fellBack) return;
        fellBack = true;
        swapStrategy(new LocalStorageStrategy());
        await reload();
      }
    };
    void load();

    const unsubscribe = repository.onChange(() => {
      void reload();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [repository, reload, swapStrategy]);

  return { ...data, reload };
}
