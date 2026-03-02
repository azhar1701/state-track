import { logger } from './logger';

// ---------------------------------------------------------------------------
// Query Monitor — lightweight usage tracking for Supabase operations
// ---------------------------------------------------------------------------

interface QueryMetrics {
  /** Total queries executed (cache hit + miss) */
  totalQueries: number;
  /** Queries served from cache */
  cacheHits: number;
  /** Queries that went to Supabase */
  cacheMisses: number;
  /** Realtime events received (after batching) */
  realtimeEvents: number;
  /** Per-key query counts for identifying hot queries */
  queriesByKey: Record<string, number>;
  /** Per-channel realtime event counts */
  realtimeByChannel: Record<string, number>;
  /** Session start timestamp */
  sessionStart: number;
}

const metrics: QueryMetrics = {
  totalQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  realtimeEvents: 0,
  queriesByKey: {},
  realtimeByChannel: {},
  sessionStart: Date.now(),
};

// Log a summary every N queries
const LOG_INTERVAL = 50;

/**
 * Track a query execution (called by cachedQuery).
 */
export function trackQuery(key: string, cached: boolean): void {
  metrics.totalQueries++;
  if (cached) {
    metrics.cacheHits++;
  } else {
    metrics.cacheMisses++;
  }

  metrics.queriesByKey[key] = (metrics.queriesByKey[key] ?? 0) + 1;

  // Periodic summary log
  if (metrics.totalQueries % LOG_INTERVAL === 0) {
    logSummary();
  }
}

/**
 * Track a realtime event batch flush (called by RealtimeBatcher).
 */
export function trackRealtimeEvent(channel: string): void {
  metrics.realtimeEvents++;
  metrics.realtimeByChannel[channel] = (metrics.realtimeByChannel[channel] ?? 0) + 1;
}

/**
 * Get a snapshot of current metrics.
 */
export function getMetrics(): Readonly<QueryMetrics> {
  return { ...metrics };
}

/**
 * Reset all metrics (useful for testing or session boundaries).
 */
export function resetMetrics(): void {
  metrics.totalQueries = 0;
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.realtimeEvents = 0;
  metrics.queriesByKey = {};
  metrics.realtimeByChannel = {};
  metrics.sessionStart = Date.now();
}

/**
 * Get cache hit rate as a percentage (0–100).
 */
export function getCacheHitRate(): number {
  if (metrics.totalQueries === 0) return 0;
  return Math.round((metrics.cacheHits / metrics.totalQueries) * 100);
}

/**
 * Get the top N most-queried keys.
 */
export function getHotQueries(n: number = 5): Array<{ key: string; count: number }> {
  return Object.entries(metrics.queriesByKey)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

/**
 * Log a human-readable summary of current metrics.
 */
function logSummary(): void {
  const uptimeMin = Math.round((Date.now() - metrics.sessionStart) / 60_000);
  const hitRate = getCacheHitRate();
  const hotQueries = getHotQueries(3);

  logger.info('[QueryMonitor] Summary', {
    uptimeMinutes: uptimeMin,
    totalQueries: metrics.totalQueries,
    cacheHitRate: `${hitRate}%`,
    realtimeEvents: metrics.realtimeEvents,
    hotQueries: hotQueries.map((q) => `${q.key}(${q.count})`).join(', '),
  });
}
