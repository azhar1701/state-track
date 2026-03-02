import { logger } from './logger';

// ---------------------------------------------------------------------------
// Rate Limiter — sliding window for client-side Supabase call throttling
// ---------------------------------------------------------------------------

interface RateLimiterOptions {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Label for logging (default: 'default') */
  label?: string;
}

interface RateLimiter {
  /** Check if a new request can proceed without exceeding the limit */
  canProceed: () => boolean;
  /** Record a request timestamp (call after a query is made) */
  track: () => void;
  /** Check and track in one call — returns true if allowed, false if throttled */
  acquire: () => boolean;
  /** Clear all tracked timestamps */
  reset: () => void;
  /** Get current request count in the active window */
  getCount: () => number;
}

/**
 * Create a sliding-window rate limiter.
 *
 * This is a CLIENT-SIDE limiter to prevent runaway queries from consuming
 * Supabase quota. It does NOT replace server-side rate limiting.
 *
 * @example
 * ```ts
 * // Allow max 100 queries per minute
 * const limiter = createRateLimiter({ maxRequests: 100, windowMs: 60_000 });
 *
 * async function fetchData() {
 *   if (!limiter.acquire()) {
 *     logger.warn('Rate limited — skipping query');
 *     return;
 *   }
 *   const { data } = await supabase.from('reports').select('*');
 *   return data;
 * }
 * ```
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { maxRequests, windowMs, label = 'default' } = options;
  const timestamps: number[] = [];

  /** Remove timestamps outside the current window */
  function prune(): void {
    const cutoff = Date.now() - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  function canProceed(): boolean {
    prune();
    return timestamps.length < maxRequests;
  }

  function track(): void {
    timestamps.push(Date.now());
    // Keep array bounded — shouldn't grow beyond maxRequests in normal operation
    if (timestamps.length > maxRequests * 2) {
      prune();
    }
  }

  function acquire(): boolean {
    if (!canProceed()) {
      logger.warn(`[RateLimiter:${label}] Throttled`, {
        current: timestamps.length,
        max: maxRequests,
        windowMs,
      });
      return false;
    }
    track();
    return true;
  }

  function reset(): void {
    timestamps.length = 0;
  }

  function getCount(): number {
    prune();
    return timestamps.length;
  }

  return { canProceed, track, acquire, reset, getCount };
}

// ---------------------------------------------------------------------------
// Pre-configured global limiter
// ---------------------------------------------------------------------------

/**
 * Global rate limiter for all Supabase queries.
 * 120 requests per minute should be generous for any normal usage pattern.
 * Hitting this means something is looping or a realtime handler is misbehaving.
 */
export const globalQueryLimiter = createRateLimiter({
  maxRequests: 120,
  windowMs: 60_000,
  label: 'global',
});
