/**
 * useReportStats.ts
 * Shared hook for report status counts: { total, baru, diproses, selesai }.
 * Uses a single query + client-side grouping instead of 4 parallel head queries.
 * Replaces the duplicated pattern in Home.tsx and useAdminReports.ts.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/services/client";
import { cachedQuery, invalidateCache } from "@/lib/supabase-cache";
import { createRealtimeBatcher, type RealtimePayload } from "@/lib/realtime-batcher";
import { logger } from "@/lib/logger";

export interface ReportStats {
  total: number;
  baru: number;
  diproses: number;
  selesai: number;
}

interface UseReportStatsResult {
  stats: ReportStats;
  loading: boolean;
  refetch: () => Promise<void>;
}

const STATS_CACHE_KEY = "shared:report-stats:v1";

const DEFAULT_STATS: ReportStats = { total: 0, baru: 0, diproses: 0, selesai: 0 };

export const useReportStats = (): UseReportStatsResult => {
  const [stats, setStats] = useState<ReportStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await cachedQuery(
        STATS_CACHE_KEY,
        () => supabase.from("reports").select("status"),
        { ttlMs: 60_000, staleWhileRevalidate: true },
      );

      if (!error && data) {
        const rows = data as Array<{ status: string }>;
        const counts: ReportStats = { total: rows.length, baru: 0, diproses: 0, selesai: 0 };
        for (const row of rows) {
          if (row.status === "baru") counts.baru += 1;
          else if (row.status === "diproses") counts.diproses += 1;
          else if (row.status === "selesai") counts.selesai += 1;
        }
        setStats(counts);
      }
    } catch (err) {
      logger.error("useReportStats fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();

    const batcher = createRealtimeBatcher(
      () => {
        invalidateCache(STATS_CACHE_KEY);
        void refetch();
      },
      { debounceMs: 500, maxWaitMs: 3000, channel: "report-stats-changes" },
    );

    const channel = supabase
      .channel("report-stats-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) =>
        batcher.push(payload as RealtimePayload),
      )
      .subscribe();

    return () => {
      batcher.destroy();
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { stats, loading, refetch };
};