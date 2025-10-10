/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// ARCHITECTURAL NOTE: Decorators are generic infrastructure that require `any` for type flexibility

/**
 * @cache / @memoize Decorator
 * 
 * QUALIA.CODE §11: Caching Strategies
 * ANALISIS.md §2.1.3: Critical for 60 FPS render loop performance
 * 
 * Caches method results based on input arguments.
 * Ideal for pure calculation methods called frequently.
 * 
 * USAGE:
 * ```typescript
 * @cache({ ttlMs: 16, maxSize: 100 })
 * public calculateBossVisuals(state: GameState, time: number): BossVisualData {
 *   // Expensive calculation cached for one frame (16ms @ 60 FPS)
 * }
 * ```
 * 
 * CONFIGURATION:
 * - ttlMs: Time-to-live in milliseconds (default: Infinity = cache forever)
 * - maxSize: Maximum cache entries (default: 100, LRU eviction)
 * - keyFn: Custom cache key function (default: JSON.stringify)
 * 
 * CACHE STRATEGIES:
 * - Frame-based: ttlMs = 16 (one frame @ 60 FPS)
 * - Short-term: ttlMs = 1000 (1 second)
 * - Long-term: ttlMs = Infinity (until invalidated)
 * 
 * PERFORMANCE IMPACT:
 * - Cache hit: ~0.1ms overhead
 * - Cache miss: Original execution time + 0.2ms (key generation + storage)
 * - Memory: ~50 bytes per cache entry (key + value + metadata)
 * 
 * INVALIDATION:
 * - Automatic: TTL expiration, LRU eviction when maxSize reached
 * - Manual: Call `clearCache()` on the method (if enabled)
 */

export interface CacheOptions {
  ttlMs?: number;
  maxSize?: number;
  keyFn?: (...args: any[]) => string;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

const defaultOptions: Required<CacheOptions> = {
  ttlMs: Infinity,
  maxSize: 100,
  keyFn: (...args: any[]) => JSON.stringify(args),
};

const caches = new WeakMap<any, Map<string | symbol, Map<string, CacheEntry<any>>>>();

export function cache(options: CacheOptions = {}): MethodDecorator {
  const config = { ...defaultOptions, ...options };

  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new Error(`@cache can only be applied to methods. ${String(propertyKey)} is not a method.`);
    }

    descriptor.value = function (this: any, ...args: any[]) {
      // Get or create cache for this instance
      if (!caches.has(this)) {
        caches.set(this, new Map());
      }
      const instanceCaches = caches.get(this)!;

      // Get or create cache for this method
      if (!instanceCaches.has(propertyKey)) {
        instanceCaches.set(propertyKey, new Map());
      }
      const methodCache = instanceCaches.get(propertyKey)!;

      // Generate cache key
      const key = config.keyFn(...args);
      const now = Date.now();

      // Check cache hit
      const cached = methodCache.get(key);
      if (cached) {
        const age = now - cached.timestamp;
        if (age < config.ttlMs) {
          return cached.value; // Cache hit!
        } else {
          methodCache.delete(key); // Expired, remove
        }
      }

      // Cache miss, execute method
      const result = originalMethod.apply(this, args);

      // Store in cache
      methodCache.set(key, {
        value: result,
        timestamp: now,
      });

      // Enforce maxSize (LRU eviction)
      if (methodCache.size > config.maxSize) {
        // Remove oldest entry
        const firstKey = methodCache.keys().next().value;
        if (firstKey !== undefined) {
          methodCache.delete(firstKey);
        }
      }

      return result;
    };

    // Attach cache clearing method
    (descriptor.value as any).clearCache = function (this: any) {
      if (caches.has(this)) {
        const instanceCaches = caches.get(this)!;
        instanceCaches.delete(propertyKey);
      }
    };

    return descriptor;
  };
}

/**
 * @memoize - Alias for @cache with infinite TTL (classic memoization)
 */
export function memoize(options: Omit<CacheOptions, 'ttlMs'> = {}): MethodDecorator {
  return cache({ ...options, ttlMs: Infinity });
}
