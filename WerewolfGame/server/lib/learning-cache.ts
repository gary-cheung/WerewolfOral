/**
 * Learning API Cache — Consistent demo responses.
 *
 * Caches AI-generated learning content in-memory by request key.
 * Same input → same output every time. No variation between calls.
 *
 * To refresh a cached response, restart the server or call clearCache().
 */

interface CacheEntry {
  data: unknown;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Build a cache key from function name + arguments */
export function buildCacheKey(fn: string, args: Record<string, unknown>): string {
  const sorted = Object.keys(args)
    .sort()
    .map((k) => `${k}=${JSON.stringify(args[k])}`)
    .join("&");
  return `${fn}:${sorted}`;
}

/** Get cached response or null */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry) {
    console.log(`[Learning Cache] HIT: ${key.substring(0, 80)}...`);
    return entry.data as T;
  }
  return null;
}

/** Store response in cache */
export function setCache(key: string, data: unknown): void {
  console.log(`[Learning Cache] SET: ${key.substring(0, 80)}...`);
  cache.set(key, { data, cachedAt: Date.now() });
}

/** Clear all cached responses (for refreshing content) */
export function clearCache(): number {
  const count = cache.size;
  cache.clear();
  console.log(`[Learning Cache] Cleared ${count} entries`);
  return count;
}

/** Get cache stats */
export function getCacheStats(): { entries: number; keys: string[] } {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
  };
}
