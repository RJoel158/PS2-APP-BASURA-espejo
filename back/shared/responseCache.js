const cache = new Map();
const inFlight = new Map();

const defaultTtlMs = Number(process.env.API_CACHE_TTL_MS || 30000);
const maxEntries = Number(process.env.API_CACHE_MAX_ENTRIES || 500);

const now = () => Date.now();

const cleanupExpired = () => {
  const timestamp = now();
  for (const [key, item] of cache.entries()) {
    if (!item || item.expiresAt <= timestamp) {
      cache.delete(key);
    }
  }
};

const trimIfNeeded = () => {
  if (cache.size <= maxEntries) return;

  const entries = Array.from(cache.entries()).sort((a, b) => (a[1].storedAt || 0) - (b[1].storedAt || 0));
  const overflow = cache.size - maxEntries;

  for (let i = 0; i < overflow; i += 1) {
    cache.delete(entries[i][0]);
  }
};

export const getCached = (key) => {
  const item = cache.get(key);
  if (!item) return null;

  if (item.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }

  return item.value;
};

export const setCached = (key, value, ttlMs = defaultTtlMs) => {
  cache.set(key, {
    value,
    storedAt: now(),
    expiresAt: now() + Math.max(1000, Number(ttlMs) || defaultTtlMs)
  });

  cleanupExpired();
  trimIfNeeded();
};

export const getOrSetCached = async (key, producer, ttlMs = defaultTtlMs) => {
  const hit = getCached(key);
  if (hit !== null) {
    return hit;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const task = (async () => {
    const value = await producer();
    setCached(key, value, ttlMs);
    return value;
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
};

export const invalidateByPrefix = (prefix) => {
  if (!prefix) return;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }

  for (const key of inFlight.keys()) {
    if (key.startsWith(prefix)) {
      inFlight.delete(key);
    }
  }
};

export const invalidateKey = (key) => {
  if (!key) return;
  cache.delete(key);
  inFlight.delete(key);
};

export const cacheStats = () => ({ size: cache.size, maxEntries, defaultTtlMs });
