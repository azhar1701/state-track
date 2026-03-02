import { logger } from './logger';
import { trackQuery } from './query-monitor';

// ---------------------------------------------------------------------------
// Supabase Query Cache — TTL + Stale-While-Revalidate
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

/** Default TTL: 30 seconds */
const DEFAULT_TTL_MS = 30_000;

/**
 * Max entries to prevent unbounded memory growth.
 * When exceeded, oldest entries are evicted first (LRU-ish).
 */
const MAX_ENTRIES = 200;

const store = new Map<string, CacheEntry<unknown>>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp > entry.ttlMs;
}

function isStale(entry: CacheEntry<unknown>): boolean {
  // Stale window = 2× TTL (fresh → stale → expired)
  return Date.now() - entry.timestamp > entry.ttlMs * 2;
}

function isHardExpired(entry: CacheEntry<unknown>): boolean {
  // Hard expiry = 5× TTL — after this, never serve stale data
  return Date.now() - entry.timestamp > entry.ttlMs * 5;
}
function evictOldest(): void {
  if (store.size <= MAX_ENTRIES) return;

  // Find the oldest entry and remove it
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of store) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    store.delete(oldestKey);
    logger.debug('[Cache] Evicted oldest entry', { key: oldestKey });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a cached value if it exists and is not hard-expired.
 * Returns `null` if not found or hard-expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (isHardExpired(entry)) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store a value in the cache with optional TTL override.
 */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  evictOldest();
  store.set(key, { data, timestamp: Date.now(), ttlMs });
}

/**
 * Invalidate cache entries matching a key prefix.
 * If no prefix is given, clears the entire cache.
 */
export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    const size = store.size;
    store.clear();
    logger.debug('[Cache] Cleared all entries', { count: size });
    return;
  }

  let removed = 0;
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
      removed++;
    }
  }
  if (removed > 0) {
    logger.debug('[Cache] Invalidated entries', { prefix: keyPrefix, count: removed });
  }
}

// Supabase query result shape
interface SupabaseResult<T> {
  data: T | null;
  error: unknown;
  count?: number | null;
}

interface CachedQueryOptions {
  /** Cache TTL in milliseconds (default: 30s) */
  ttlMs?: number;
  /**
   * When true, returns stale data immediately while revalidating in background.
   * When false (default), waits for fresh data if cache is stale.
   */
  staleWhileRevalidate?: boolean;
}

/**
 * Execute a Supabase query with caching.
 *
 * @example
 * ```ts
 * const { data, error } = await cachedQuery(
 *   'reports:list',
 *   () => supabase.from('reports').select('id,status').limit(50),
 *   { ttlMs: 60_000, staleWhileRevalidate: true }
 * );
 * ```
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => PromiseLike<SupabaseResult<T>>,
  options: CachedQueryOptions = {},
): Promise<SupabaseResult<T>> {
  const { ttlMs = DEFAULT_TTL_MS, staleWhileRevalidate = false } = options;

  const existing = store.get(key) as CacheEntry<SupabaseResult<T>> | undefined;

  // --- Fresh cache hit ---
  if (existing && !isExpired(existing)) {
    trackQuery(key, true);
    logger.debug('[Cache] HIT (fresh)', { key });
    return existing.data;
  }

  // --- Stale-while-revalidate: serve stale, refresh in background ---
  if (existing && staleWhileRevalidate && isStale(existing) && !isHardExpired(existing)) {
    trackQuery(key, true);
    logger.debug('[Cache] HIT (stale, revalidating)', { key });

    // Fire-and-forget background revalidation
    void (async () => {
      try {
        const result = await queryFn();
        if (!result.error && result.data !== null) {
          setCache(key, result, ttlMs);
        }
      } catch (e) {
        logger.warn('[Cache] Background revalidation failed', { key, error: e });
      }
    })();

    return existing.data;
  }

  // --- Cache miss or hard-expired: fetch fresh ---
  trackQuery(key, false);
  logger.debug('[Cache] MISS', { key });

  const result = await queryFn();

  // Only cache successful results
  if (!result.error && result.data !== null) {
    setCache(key, result, ttlMs);
  }

  return result;
}

/**
 * Get current cache size (for monitoring).
 */
export function getCacheSize(): number {
  return store.size;
}
