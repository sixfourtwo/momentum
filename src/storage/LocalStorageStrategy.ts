import type { StorageStrategy } from './StorageStrategy';

const DELIMITER = ':';

/**
 * Synchronous-API-behind-async-methods fallback driver. Handy for inspection
 * in devtools and for environments without IndexedDB (e.g. private-mode Safari).
 */
export class LocalStorageStrategy implements StorageStrategy {
  readonly name = 'LocalStorageStrategy';
  private readonly prefix: string;

  constructor(keyPrefix = 'momentum') {
    this.prefix = `${keyPrefix}${DELIMITER}`;
  }

  private key(collection: string, id: string): string {
    return `${this.prefix}${collection}${DELIMITER}${id}`;
  }

  private collectionPrefix(collection: string): string {
    return `${this.prefix}${collection}${DELIMITER}`;
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const prefix = this.collectionPrefix(collection);
    const items: T[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key);
        if (raw !== null) items.push(JSON.parse(raw) as T);
      }
    }
    return items;
  }

  async getById<T>(collection: string, id: string): Promise<T | undefined> {
    const raw = localStorage.getItem(this.key(collection, id));
    return raw === null ? undefined : (JSON.parse(raw) as T);
  }

  async put<T extends { id: string }>(collection: string, item: T): Promise<void> {
    localStorage.setItem(this.key(collection, item.id), JSON.stringify(item));
  }

  async delete(collection: string, id: string): Promise<void> {
    localStorage.removeItem(this.key(collection, id));
  }

  async clear(collection: string): Promise<void> {
    const prefix = this.collectionPrefix(collection);
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null && key.startsWith(prefix)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  }
}
