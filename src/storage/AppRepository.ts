import type { FitnessProfile, WorkoutCategory, WorkoutLog } from '../types';
import type { StorageStrategy } from './StorageStrategy';

export const COLLECTIONS = {
  logs: 'logs',
  profile: 'profile',
} as const;

export const PROFILE_ID = 'default_profile';

type ChangeListener = () => void;

/**
 * Domain-focused data access over a swappable StorageStrategy (spec §2).
 * UI code never touches strategies directly. Mutations notify subscribers so
 * the React layer can re-hydrate immediately (no background timers involved).
 */
export class AppRepository {
  private strategy: StorageStrategy;
  private readonly listeners = new Set<ChangeListener>();

  constructor(strategy: StorageStrategy) {
    this.strategy = strategy;
  }

  getStrategyName(): string {
    return this.strategy.name;
  }

  /** Swaps the storage backend at runtime and notifies subscribers. */
  setStrategy(strategy: StorageStrategy): void {
    this.strategy = strategy;
    this.emit();
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getProfile(): Promise<FitnessProfile | undefined> {
    return this.strategy.getById<FitnessProfile>(COLLECTIONS.profile, PROFILE_ID);
  }

  async saveProfile(profile: FitnessProfile): Promise<void> {
    await this.strategy.put(COLLECTIONS.profile, profile);
    this.emit();
  }

  async getAllLogs(): Promise<WorkoutLog[]> {
    const logs = await this.strategy.getAll<WorkoutLog>(COLLECTIONS.logs);
    return logs.sort((a, b) => a.timestamp - b.timestamp || a.createdAt - b.createdAt);
  }

  async getLogsByCategory(category: WorkoutCategory): Promise<WorkoutLog[]> {
    const logs = await this.getAllLogs();
    return logs.filter((log) => log.category === category);
  }

  async addLog(log: WorkoutLog): Promise<void> {
    await this.strategy.put(COLLECTIONS.logs, log);
    this.emit();
  }

  async deleteLog(id: string): Promise<void> {
    await this.strategy.delete(COLLECTIONS.logs, id);
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
