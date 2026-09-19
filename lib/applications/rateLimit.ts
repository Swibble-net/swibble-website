/**
 * Minimal in-memory sliding-window rate limiter. State lives per serverless
 * instance, so it only slows down bursts hitting the same instance — the real
 * spam protection is Turnstile. IPs are kept in memory only, never persisted
 * or logged.
 */
export interface RateLimiter {
  /** Registers a hit; false when the caller is over the limit. */
  allow(key: string, now?: number): boolean;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    allow(key, now = Date.now()) {
      // Drop expired entries so the map can't grow without bound.
      for (const [k, times] of hits) {
        const fresh = times.filter((t) => now - t < windowMs);
        if (fresh.length === 0) hits.delete(k);
        else hits.set(k, fresh);
      }

      const recent = hits.get(key) ?? [];
      if (recent.length >= limit) return false;
      hits.set(key, [...recent, now]);
      return true;
    },
  };
}
