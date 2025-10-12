import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '@/integrations/supabase/types';

// Minimal payload we need to replay submission
export type ReportOutboxPayload = {
  title: string;
  description: string;
  category: Database['public']['Enums']['report_category'];
  severity: 'ringan' | 'sedang' | 'berat';
  incidentDate: string; // YYYY-MM-DD
  reporterName: string;
  phone: string;
  kecamatan: string;
  desa: string;
  location: { latitude: number; longitude: number; name?: string | null };
};

export type OutboxReport = {
  id: string; // uuid
  createdAt: number;
  payload: ReportOutboxPayload;
  photos: Array<{ name: string; type: string; data: Blob }>; // photo blobs
};

interface OutboxDB extends DBSchema {
  reports: {
    key: string;
    value: OutboxReport;
    indexes: { 'by-createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OutboxDB>('state-track-outbox', 1, {
      upgrade(db) {
        const store = db.createObjectStore('reports', { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function addReportToOutbox(item: Omit<OutboxReport, 'id' | 'createdAt'> & { id?: string }) {
  const db = await getDB();
  const id = item.id ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const createdAt = Date.now();
  await db.put('reports', { id, createdAt, payload: item.payload, photos: item.photos });
  return id;
}

export async function listOutboxReports() {
  const db = await getDB();
  return await db.getAllFromIndex('reports', 'by-createdAt');
}

export async function deleteOutboxReport(id: string) {
  const db = await getDB();
  await db.delete('reports', id);
}

export async function clearOutbox() {
  const db = await getDB();
  await db.clear('reports');
}

// Background Sync helper
export async function registerBackgroundSync(tag = 'submit-reports') {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const anyReg = reg as unknown as { sync?: { register: (t: string) => Promise<void> } };
      if (anyReg.sync?.register) {
        await anyReg.sync.register(tag);
      }
      return true;
    } catch (e) {
      // ignore if denied or not allowed
    }
  }
  return false;
}

// Manually trigger outbox sync from UI: try to register background sync and
// then dispatch an 'online' event which our hook listens to.
export async function triggerOutboxSync() {
  try {
    await registerBackgroundSync();
  } catch { /* ignore */ }
  try {
    window.dispatchEvent(new Event('online'));
    return true;
  } catch {
    return false;
  }
}
