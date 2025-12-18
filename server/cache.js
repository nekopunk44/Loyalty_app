/**
 * Кэш-абстракция: Redis при наличии REDIS_URL, иначе in-memory Map с TTL.
 * API одинаковый, чтобы код роутов не зависел от провайдера.
 *
 *   await cache.get(key)           — null если нет/истёк
 *   await cache.set(key, val, ttl) — ttl в секундах
 *   await cache.del(key | pattern) — '*' в конце поддерживается для in-memory; в Redis — KEYS+DEL
 */
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL;
let client = null;       // ioredis instance
let memStore = null;     // fallback Map<string, { value, expiresAt }>

if (REDIS_URL) {
  try {
    const Redis = require('ioredis');
    client = new Redis(REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    client.on('error', (err) => {
      logger.warn('Redis error', { error: err.message });
    });
    client.on('connect', () => logger.info('Redis connected'));
  } catch (err) {
    logger.warn('Redis init failed, falling back to in-memory', { error: err.message });
    client = null;
  }
}

if (!client) {
  memStore = new Map();
  logger.info('Cache backend: in-memory (set REDIS_URL to use Redis)');

  // Уборщик протухших ключей раз в минуту
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memStore.entries()) {
      if (v.expiresAt && v.expiresAt < now) memStore.delete(k);
    }
  }, 60_000).unref();
}

const cache = {
  async get(key) {
    if (client) {
      try {
        const raw = await client.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        logger.warn('cache.get failed', { key, error: err.message });
        return null;
      }
    }
    const entry = memStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key, value, ttlSeconds = 60) {
    if (client) {
      try {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        logger.warn('cache.set failed', { key, error: err.message });
      }
      return;
    }
    memStore.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  },

  async del(keyOrPattern) {
    if (client) {
      try {
        if (keyOrPattern.endsWith('*')) {
          const keys = await client.keys(keyOrPattern);
          if (keys.length) await client.del(...keys);
        } else {
          await client.del(keyOrPattern);
        }
      } catch (err) {
        logger.warn('cache.del failed', { keyOrPattern, error: err.message });
      }
      return;
    }
    if (keyOrPattern.endsWith('*')) {
      const prefix = keyOrPattern.slice(0, -1);
      for (const k of memStore.keys()) {
        if (k.startsWith(prefix)) memStore.delete(k);
      }
    } else {
      memStore.delete(keyOrPattern);
    }
  },
};

module.exports = cache;
