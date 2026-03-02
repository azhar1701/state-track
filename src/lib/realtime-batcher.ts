import { logger } from './logger';
import { trackRealtimeEvent } from './query-monitor';

// ---------------------------------------------------------------------------
// Realtime Event Batcher — debounce + max-wait for Supabase postgres_changes
// ---------------------------------------------------------------------------

/**
 * Payload shape from Supabase realtime `postgres_changes`.
 * We keep it loose to avoid coupling to Supabase internals.
 */
export interface RealtimePayload {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  [key: string]: unknown;
}

interface BatcherOptions {
  /** Debounce window in ms — resets on every new event (default: 500ms) */
  debounceMs?: number;
  /** Maximum wait before forced flush, regardless of debounce (default: 2000ms) */
  maxWaitMs?: number;
  /** Channel name for monitoring (default: 'unknown') */
  channel?: string;
}

interface RealtimeBatcher {
  /** Push an incoming realtime event into the buffer */
  push: (payload: RealtimePayload) => void;
  /** Force-flush buffered events immediately */
  flush: () => void;
  /** Clean up timers — call on unmount */
  destroy: () => void;
}

/**
 * Create a batched handler for Supabase realtime events.
 *
 * Instead of calling the callback on every single `postgres_changes` event,
 * this buffers events and calls the callback once after a debounce window,
 * with a hard maximum wait to prevent indefinite delays under rapid updates.
 *
 * @param callback - Called once per batch with all buffered payloads.
 *                   Typically triggers a re-fetch rather than merging payloads.
 *
 * @example
 * ```ts
 * const batcher = createRealtimeBatcher(
 *   (payloads) => {
 *     // One re-fetch instead of N re-fetches
 *     fetchReports();
 *     fetchStats();
 *   },
 *   { debounceMs: 500, maxWaitMs: 2000, channel: 'reports-realtime' }
 * );
 *
 * channel.on('postgres_changes', { event: '*', schema: 'public', table: 'reports' },
 *   (payload) => batcher.push(payload as RealtimePayload)
 * );
 *
 * // On unmount:
 * batcher.destroy();
 * ```
 */
export function createRealtimeBatcher(
  callback: (payloads: RealtimePayload[]) => void,
  options: BatcherOptions = {},
): RealtimeBatcher {
  const {
    debounceMs = 500,
    maxWaitMs = 2000,
    channel = 'unknown',
  } = options;

  let buffer: RealtimePayload[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  function clearTimers(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (maxWaitTimer !== null) {
      clearTimeout(maxWaitTimer);
      maxWaitTimer = null;
    }
  }

  function doFlush(): void {
    if (destroyed) return;
    clearTimers();

    if (buffer.length === 0) return;

    const payloads = buffer;
    buffer = [];

    logger.debug('[RealtimeBatcher] Flushing', {
      channel,
      count: payloads.length,
    });

    trackRealtimeEvent(channel);

    try {
      callback(payloads);
    } catch (e) {
      logger.error('[RealtimeBatcher] Callback error', e);
    }
  }

  function push(payload: RealtimePayload): void {
    if (destroyed) return;

    buffer.push(payload);

    // Reset debounce timer on every push
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(doFlush, debounceMs);

    // Start max-wait timer on first event in batch
    if (maxWaitTimer === null) {
      maxWaitTimer = setTimeout(doFlush, maxWaitMs);
    }
  }

  function flush(): void {
    doFlush();
  }

  function destroy(): void {
    destroyed = true;
    clearTimers();
    buffer = [];
  }

  return { push, flush, destroy };
}
