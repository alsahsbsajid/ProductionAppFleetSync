import { logger } from './logger';

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum number of items in memory cache
}

// Default cache configurations
const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  vehicles: { ttl: 300, maxSize: 1000 }, // 5 minutes
  payments: { ttl: 180, maxSize: 500 }, // 3 minutes
  statistics: { ttl: 600, maxSize: 100 }, // 10 minutes
  user_sessions: { ttl: 3600, maxSize: 200 }, // 1 hour
  api_responses: { ttl: 60, maxSize: 1000 }, // 1 minute
};

// Memory cache item
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory cache implementation
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // Remove expired items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // If still full after cleanup, remove oldest item
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Remove expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Redis cache implementation (for production)
class RedisCache {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    // Initialize Redis client if available
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Only initialize Redis in production or if explicitly configured
      if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
        const { createClient } = await import('redis');
        this.client = createClient({
          url: process.env.REDIS_URL,
        });

        await this.client.connect();
        this.isConnected = true;
        logger.info('Redis cache connected successfully');
      }
    } catch (error) {
      logger.error('Failed to connect to Redis cache', {}, error as Error);
      this.isConnected = false;
    }
  }

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('Redis cache set error', { key }, error as Error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis cache get error', { key }, error as Error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis cache delete error', { key }, error as Error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.flushAll();
    } catch (error) {
      logger.error('Redis cache clear error', {}, error as Error);
    }
  }
}

// Main cache manager
class CacheManager {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache;
  private configs: Record<string, CacheConfig>;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.configs = DEFAULT_CONFIGS;
  }

  // Generate cache key
  private generateKey(namespace: string, identifier: string): string {
    return `fleetsync:${namespace}:${identifier}`;
  }

  // Get configuration for namespace
  private getConfig(namespace: string): CacheConfig {
    return this.configs[namespace] || { ttl: 300, maxSize: 1000 };
  }

  // Set cache item
  async set<T>(namespace: string, identifier: string, data: T): Promise<void> {
    const key = this.generateKey(namespace, identifier);
    const config = this.getConfig(namespace);

    // Set in memory cache
    this.memoryCache.set(key, data, config.ttl);

    // Set in Redis cache (if available)
    await this.redisCache.set(key, data, config.ttl);

    logger.debug('Cache set', { namespace, identifier, ttl: config.ttl });
  }

  // Get cache item
  async get<T>(namespace: string, identifier: string): Promise<T | null> {
    const key = this.generateKey(namespace, identifier);

    // Try memory cache first
    let data = this.memoryCache.get<T>(key);
    if (data !== null) {
      logger.debug('Cache hit (memory)', { namespace, identifier });
      return data;
    }

    // Try Redis cache
    data = await this.redisCache.get<T>(key);
    if (data !== null) {
      // Populate memory cache
      const config = this.getConfig(namespace);
      this.memoryCache.set(key, data, config.ttl);
      logger.debug('Cache hit (Redis)', { namespace, identifier });
      return data;
    }

    logger.debug('Cache miss', { namespace, identifier });
    return null;
  }

  // Delete cache item
  async delete(namespace: string, identifier: string): Promise<void> {
    const key = this.generateKey(namespace, identifier);

    this.memoryCache.delete(key);
    await this.redisCache.delete(key);

    logger.debug('Cache deleted', { namespace, identifier });
  }

  // Clear namespace
  async clearNamespace(namespace: string): Promise<void> {
    // For memory cache, we need to iterate and delete matching keys
    const stats = this.memoryCache.getStats();
    const prefix = `fleetsync:${namespace}:`;

    for (const key of stats.keys) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // For Redis, we would need to scan and delete (simplified here)
    logger.debug('Cache namespace cleared', { namespace });
  }

  // Cache with function execution
  async getOrSet<T>(
    namespace: string,
    identifier: string,
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(namespace, identifier);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const data = await fetchFunction();
      await this.set(namespace, identifier, data);
      return data;
    } catch (error) {
      logger.error(
        'Cache getOrSet function failed',
        { namespace, identifier },
        error as Error
      );
      throw error;
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      configs: this.configs,
    };
  }

  // Configure cache for namespace
  configure(namespace: string, config: CacheConfig): void {
    this.configs[namespace] = config;
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Utility functions
export function withCache<T>(
  namespace: string,
  identifier: string,
  fetchFunction: () => Promise<T>
): Promise<T> {
  return cache.getOrSet(namespace, identifier, fetchFunction);
}

// Cache invalidation helper
export async function invalidateCache(
  namespace: string,
  identifier?: string
): Promise<void> {
  if (identifier) {
    await cache.delete(namespace, identifier);
  } else {
    await cache.clearNamespace(namespace);
  }
}
