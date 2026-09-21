/**
 * useMapReports.ts
 * Fetches all reports for the map view using cachedQuery + realtime batcher.
 * Filtering is done client-side in MapView to avoid redundant network requests.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/client';
import { cachedQuery, invalidateCache } from '@/lib/supabase-cache';
import { createRealtimeBatcher, type RealtimePayload } from '@/lib/realtime-batcher';
import type { Report } from '@/services/types';

export type { Report };

const REPORTS_CACHE_KEY = 'map:reports:v3';
const REPORTS_SELECT =
  'id, user_id, latitude, longitude, category, status, created_at, location_name, title, description, severity, kecamatan, desa, photo_url, photo_urls, resolution, reporter_name, phone';

interface UseMapReportsResult {
  reports: Report[];
  loading: boolean;
  fetchReports: () => Promise<void>;
}

export const useMapReports = (): UseMapReportsResult => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await cachedQuery(
      REPORTS_CACHE_KEY,
      () =>
        supabase
          .from('reports')
          .select(REPORTS_SELECT)
          .order('created_at', { ascending: false })
          .limit(1000),
      { ttlMs: 30_000, staleWhileRevalidate: true },
    );

    if (!error && data) {
      setReports(data as unknown as Report[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchReports();

    const batcher = createRealtimeBatcher(
      () => {
        invalidateCache(REPORTS_CACHE_KEY);
        void fetchReports();
      },
      { debounceMs: 500, maxWaitMs: 2000, channel: 'map-reports-changes' },
    );

    const channel = supabase
      .channel('map-reports-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => batcher.push(payload as RealtimePayload),
      )
      .subscribe();

    return () => {
      batcher.destroy();
      void supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  return { reports, loading, fetchReports };
};
