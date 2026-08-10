// Shared server-side in-memory cache for SIGPAD API endpoints to prevent DB saturation
class SimpleCache {
  private cache = new Map<string, { timestamp: number; data: any }>();

  get(key: string, ttlMs: number) {
    const entry = this.cache.get(key);
    if (entry && (Date.now() - entry.timestamp < ttlMs)) {
      return entry.data;
    }
    return null;
  }

  set(key: string, data: any) {
    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidateAll() {
    this.cache.clear();
  }
}

// Global cache instance (persisted in Node.js module cache)
export const serverCache = new SimpleCache();
