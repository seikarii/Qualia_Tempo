// QUALIA.CODE v1.1 - @rateLimit Decorator
// Enforces rate limiting using token bucket algorithm
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export function rateLimit(maxRequests: number, windowMs: number) {
  const bucketMap = new Map<string, TokenBucket>();

  return function (
    value: (..._args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const methodKey = `${className}.${methodName}`;
      const instanceLogger = getLogger(this);
      const now = Date.now();

      let bucket = bucketMap.get(methodKey);
      if (!bucket) {
        bucket = { tokens: maxRequests, lastRefill: now };
        bucketMap.set(methodKey, bucket);
      }

      // Refill tokens based on elapsed time
      const elapsed = now - bucket.lastRefill;
      const refillTokens = Math.floor((elapsed / windowMs) * maxRequests);
      if (refillTokens > 0) {
        bucket.tokens = Math.min(maxRequests, bucket.tokens + refillTokens);
        bucket.lastRefill = now;
      }

      // Check if tokens available
      if (bucket.tokens < 1) {
        const error = new Error(`Rate limit exceeded for ${methodKey}`);
        if (instanceLogger) {
          instanceLogger.warn(`Rate limit exceeded: ${methodKey}`, { error: error.message, stack: error.stack });
        } else {
          EmergencyLogger.warn(`Rate limit exceeded: ${methodKey}`, { error: error.message, stack: error.stack });
        }
        throw error;
      }

      bucket.tokens--;
      return value.apply(this, args);
    };
  };
}
