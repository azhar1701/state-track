import { describe, it, expect, beforeEach } from 'vitest';
import { addReportToOutbox, clearOutbox, listOutboxReports, type OutboxReport } from '@/lib/outbox';

// jsdom provides indexedDB in test env via fake impls in modern runtimes

describe('outbox', () => {
  beforeEach(async () => {
    await clearOutbox();
  });

  it('adds and lists outbox items', async () => {
    const base = {
      payload: {
        title: 'Tes',
        description: 'Deskripsi',
        category: 'jalan' as const,
        severity: 'sedang' as const,
        incidentDate: '2025-10-10',
        reporterName: 'A',
        phone: '08123',
        kecamatan: 'Contoh Kecamatan',
        desa: 'Contoh Desa',
        location: { latitude: -6.2, longitude: 106.8, name: 'Jakarta' },
      },
      photos: [],
    } satisfies Omit<OutboxReport, 'id' | 'createdAt'>;

    const id = await addReportToOutbox(base);
    const all = await listOutboxReports();

    expect(all.length).toBe(1);
    expect(all[0].id).toBe(id);
    expect(all[0].payload.title).toBe('Tes');
  });
});
