/**
 * Low-level storage driver interface (Strategy pattern, spec §2).
 * Implementations: IndexedDBStrategy (default), LocalStorageStrategy, InMemoryStrategy.
 */
export interface StorageStrategy {
  readonly name: string;
  getAll<T>(collection: string): Promise<T[]>;
  getById<T>(collection: string, id: string): Promise<T | undefined>;
  put<T extends { id: string }>(collection: string, item: T): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  clear(collection: string): Promise<void>;
}

/** Domain-level data access (Repository pattern, spec §2). */
export interface AppRepository {
  getProfile(): Promise<import('../types').FitnessProfile | undefined>;
  saveProfile(profile: import('../types').FitnessProfile): Promise<void>;
  getLogsByCategory(category: import('../types').WorkoutCategory): Promise<import('../types').WorkoutLog[]>;
  getAllLogs(): Promise<import('../types').WorkoutLog[]>;
  addLog(log: import('../types').WorkoutLog): Promise<void>;
  deleteLog(id: string): Promise<void>;
  setStrategy(strategy: StorageStrategy): void;
}
