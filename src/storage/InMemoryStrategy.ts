import type { StorageStrategy } from './StorageStrategy';

/** Ephemeral in-memory driver for unit tests and sandbox mode. */
export class InMemoryStrategy implements StorageStrategy {
  readonly name = 'InMemoryStrategy';
  private readonly stores = new Map<string, Map<string, unknown>>();

  private store(collection: string): Map<string, unknown> {
    let store = this.stores.get(collection);
    if (!store) {
      store = new Map();
      this.stores.set(collection, store);
    }
    return store;
  }

  async getAll<T>(collection: string): Promise<T[]> {
    return [...this.store(collection).values()] as T[];
  }

  async getById<T>(collection: string, id: string): Promise<T | undefined> {
    return this.store(collection).get(id) as T | undefined;
  }

  async put<T extends { id: string }>(collection: string, item: T): Promise<void> {
    this.store(collection).set(item.id, item);
  }

  async delete(collection: string, id: string): Promise<void> {
    this.store(collection).delete(id);
  }

  async clear(collection: string): Promise<void> {
    this.stores.delete(collection);
  }
}
