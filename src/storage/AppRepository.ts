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
 *
 * The repository keeps a synchronous in-memory snapshot of the current
 * profile and logs. Local mutations update that snapshot in the same tick as
 * the write (after the storage driver confirms), so UI subscribers — via
 * `useSyncExternalStore` — always re-render immediately and can never miss an
 * update to a slow or hiccuping async read. `hydrate()` reconciles the
 * snapshot against the driver (mount, strategy swap, cross-tab messages).
 *
 * Note: mutations assume `hydrate()` ran at least once (the React provider
 * does this on mount).
 */
export class AppRepository {
  private strategy: StorageStrategy;
  private profileCache: FitnessProfile | undefined;
  private logsCache: WorkoutLog[] = [];
  private hydrated = false;
  private readonly listeners = new Set<ChangeListener>();
  private readonly channel: BroadcastChannel | null;

  constructor(strategy: StorageStrategy) {
    this.strategy = strategy;
    this.channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('momentum-sync') : null;
    if (this.channel) {
      this.channel.onmessage = () => {
        // Another tab mutated storage — reconcile our snapshot.
        void this.hydrate();
      };
    }
  }

  getStrategyName(): string {
    return this.strategy.name;
  }

  /** Swaps the storage backend at runtime; subscribers re-hydrate via the provider. */
  setStrategy(strategy: StorageStrategy): void {
    this.strategy = strategy;
    this.profileCache = undefined;
    this.logsCache = [];
    this.hydrated = false;
    this.emit();
  }

  /** Reads the driver and brings the synchronous snapshot up to date. */
  async hydrate(): Promise<void> {
    const [profile, logs] = await Promise.all([
      this.strategy.getById<FitnessProfile>(COLLECTIONS.profile, PROFILE_ID),
      this.strategy.getAll<WorkoutLog>(COLLECTIONS.logs),
    ]);
    this.profileCache = profile;
    this.logsCache = this.sortLogs(logs);
    this.hydrated = true;
    this.emit();
  }

  /* --------------------------- Synchronous API ---------------------------- */
  /* Snapshot identities are stable between changes — safe for useSyncExternalStore. */

  getProfileSnapshot(): FitnessProfile | undefined {
    return this.profileCache;
  }

  getLogsSnapshot(): WorkoutLog[] {
    return this.logsCache;
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  subscribe = (listener: ChangeListener): (() => void) => this.onChange(listener);

  /* ----------------------------- Async API -------------------------------- */

  async getProfile(): Promise<FitnessProfile | undefined> {
    await this.ensureHydrated();
    return this.profileCache;
  }

  async saveProfile(profile: FitnessProfile): Promise<void> {
    await this.strategy.put(COLLECTIONS.profile, profile);
    this.profileCache = profile;
    this.hydrated = true;
    this.emit();
    this.broadcast();
  }

  async getAllLogs(): Promise<WorkoutLog[]> {
    await this.ensureHydrated();
    return [...this.logsCache];
  }

  async getLogsByCategory(category: WorkoutCategory): Promise<WorkoutLog[]> {
    const logs = await this.getAllLogs();
    return logs.filter((log) => log.category === category);
  }

  async addLog(log: WorkoutLog): Promise<void> {
    await this.strategy.put(COLLECTIONS.logs, log);
    this.logsCache = this.sortLogs([...this.logsCache, log]);
    this.hydrated = true;
    this.emit();
    this.broadcast();
  }

  async deleteLog(id: string): Promise<void> {
    await this.strategy.delete(COLLECTIONS.logs, id);
    this.logsCache = this.logsCache.filter((log) => log.id !== id);
    this.hydrated = true;
    this.emit();
    this.broadcast();
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async ensureHydrated(): Promise<void> {
    if (!this.hydrated) {
      await this.hydrate();
    }
  }

  private sortLogs(logs: WorkoutLog[]): WorkoutLog[] {
    return [...logs].sort((a, b) => a.timestamp - b.timestamp || a.createdAt - b.createdAt);
  }

  private broadcast(): void {
    try {
      this.channel?.postMessage({ type: 'mutated' });
    } catch {
      // Cross-tab sync is best-effort.
    }
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
