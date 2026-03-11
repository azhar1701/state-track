import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Database } from '@/services/types';

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
  priority_score?: number;
};

export type OutboxReport = {
  id: string; // uuid
  createdAt: number;
  payload: ReportOutboxPayload;
  photos: Array<{ name: string; type: string; data: Blob }>; // photo blobs
  // New fields for robust sync
  retryCount: number;
  lastError?: string;
  photoUrls: string[]; // Successfully uploaded photo URLs
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
        if (!db.objectStoreNames.contains('reports')) {
          const store = db.createObjectStore('reports', { keyPath: 'id' });
          store.createIndex('by-createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function addReportToOutbox(item: { payload: ReportOutboxPayload, photos: OutboxReport['photos'], id?: string }) {
  const db = await getDB();
  const id = item.id ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const createdAt = Date.now();
  const outboxItem: OutboxReport = { 
    id, 
    createdAt, 
    payload: item.payload, 
    photos: item.photos,
    retryCount: 0,
    photoUrls: []
  };
  await db.put('reports', outboxItem);
  return id;
}

export async function updateOutboxReport(item: OutboxReport) {
  const db = await getDB();
  await db.put('reports', item);
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
