import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { StorageStrategy } from './StorageStrategy';

const STORE = 'kv';

/**
 * Default production driver. Uses a single key-value object store partitioned
 * by collection prefix (`<collection>:<id>`) so the strategy stays fully
 * generic — no schema migration needed when collections change.
 */
export class IndexedDBStrategy implements StorageStrategy {
  readonly name = 'IndexedDBStrategy';
  private readonly dbName: string;
  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor(dbName = 'momentum-db') {
    this.dbName = dbName;
  }

  private async db(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(this.dbName, 1, {
        upgrade(database) {
          if (!database.objectStoreNames.contains(STORE)) {
            database.createObjectStore(STORE);
          }
        },
      });
    }
    return this.dbPromise;
  }

  private static range(collection: string): IDBKeyRange {
    return IDBKeyRange.bound(`${collection}:`, `${collection}:\uffff`);
  }

  private static key(collection: string, id: string): string {
    return `${collection}:${id}`;
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const db = await this.db();
    return db.getAll(STORE, IndexedDBStrategy.range(collection)) as Promise<T[]>;
  }

  async getById<T>(collection: string, id: string): Promise<T | undefined> {
    const db = await this.db();
    return db.get(STORE, IndexedDBStrategy.key(collection, id)) as Promise<T | undefined>;
  }

  async put<T extends { id: string }>(collection: string, item: T): Promise<void> {
    const db = await this.db();
    await db.put(STORE, item, IndexedDBStrategy.key(collection, item.id));
  }

  async delete(collection: string, id: string): Promise<void> {
    const db = await this.db();
    await db.delete(STORE, IndexedDBStrategy.key(collection, id));
  }

  async clear(collection: string): Promise<void> {
    const db = await this.db();
    await db.delete(STORE, IndexedDBStrategy.range(collection));
  }
}
