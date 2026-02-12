import { openDB, type IDBPDatabase } from 'idb';
import type { FeatureCollection, Geometry } from 'geojson';

const DB_NAME = 'geo-cache';
const STORE_NAME = 'layers';
const DB_VERSION = 1;

interface CachedGeoLayer {
  key: string;
  data: FeatureCollection<Geometry>;
  timestamp: number;
  size: number;
}

class GeoCache {
  private db: IDBPDatabase | null = null;

  async init() {
    if (this.db) return;
    
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }

  async get(key: string): Promise<FeatureCollection<Geometry> | null> {
    await this.init();
    const item = await this.db!.get(STORE_NAME, key) as CachedGeoLayer | undefined;
    
    if (!item) return null;
    
    const age = Date.now() - item.timestamp;
    if (age > 30 * 60 * 1000) { // 30 minutes
      await this.delete(key);
      return null;
    }
    
    return item.data;
  }

  async set(key: string, data: FeatureCollection<Geometry>): Promise<void> {
    await this.init();
    const size = JSON.stringify(data).length;
    
    await this.db!.put(STORE_NAME, {
      key,
      data,
      timestamp: Date.now(),
      size,
    });

    await this.cleanup();
  }

  async delete(key: string): Promise<void> {
    await this.init();
    await this.db!.delete(STORE_NAME, key);
  }

  async clear(): Promise<void> {
    await this.init();
    await this.db!.clear(STORE_NAME);
  }

  async cleanup(): Promise<void> {
    await this.init();
    const all = await this.db!.getAll(STORE_NAME) as CachedGeoLayer[];
    const totalSize = all.reduce((sum, item) => sum + item.size, 0);
    
    if (totalSize > 100 * 1024 * 1024) { // 100MB
      const sorted = all.sort((a, b) => a.timestamp - b.timestamp);
      const toDelete = sorted.slice(0, Math.ceil(sorted.length / 3));
      
      for (const item of toDelete) {
        await this.delete(item.key);
      }
    }
  }

  async getSize(): Promise<number> {
    await this.init();
    const all = await this.db!.getAll(STORE_NAME) as CachedGeoLayer[];
    return all.reduce((sum, item) => sum + item.size, 0);
  }
}

export const geoCache = new GeoCache();
