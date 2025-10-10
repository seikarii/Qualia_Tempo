/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
// ARCHITECTURAL NOTE: Decorators are generic infrastructure that require `any` for type flexibility

/**
 * @retry Decorator
 * 
 * QUALIA.CODE §6: Transversal Logic - Cross-Cutting Concerns
 * ANALISIS.md §2.1.3: Critical missing decorator for I/O operations
 * 
 * Automatically retries failed async operations with exponential backoff.
 * 
 * USAGE:
 * ```typescript
 * @retry({ maxAttempts: 3, delayMs: 1000, exponentialBackoff: true })
 * public async fetchData(): Promise<Data> {
 *   return await this.httpService.get('/api/data');
 * }
 * ```
 * 
 * CONFIGURATION:
 * - maxAttempts: Maximum number of retry attempts (default: 3)
 * - delayMs: Base delay between retries in milliseconds (default: 1000)
 * - exponentialBackoff: Use exponential backoff (default: true)
 * - shouldRetry: Custom predicate to determine if error is retryable (default: all errors)
 * 
 * BEHAVIOR:
 * - Attempt 1: No delay
 * - Attempt 2: delayMs (1s)
 * - Attempt 3: delayMs * 2 (2s) if exponential, else delayMs
 * - Attempt 4: delayMs * 4 (4s) if exponential, else delayMs
 * 
 * EXCEPTIONS:
 * - Non-retryable errors (e.g., 400 Bad Request, 401 Unauthorized) can be excluded via shouldRetry predicate
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
  shouldRetry?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  exponentialBackoff: true,
  shouldRetry: () => true, // Retry all errors by default
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default predicate: only retry transient errors
 * - Network errors
 * - Timeouts
 * - 5xx server errors
 * - 429 Too Many Requests
 */
export function isTransientError(error: any): boolean {
  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP errors
  if (error.response?.status) {
    const status = error.response.status;
    return status === 429 || (status >= 500 && status < 600);
  }

  // Fetch API errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

export function retry(options: RetryOptions = {}): MethodDecorator {
  const config = { ...defaultOptions, ...options };

  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new Error(`@retry can only be applied to methods. ${String(propertyKey)} is not a method.`);
    }

    // Ensure method is async
    if (originalMethod.constructor.name !== 'AsyncFunction') {
      console.warn(
        `[@retry] Warning: ${String(propertyKey)} is not async. Retry logic may not work as expected.`
      );
    }

    descriptor.value = async function (this: any, ...args: any[]) {
      let lastError: any;
      
      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          // Try to execute the method
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          // Check if we should retry this error
          if (!config.shouldRetry(error)) {
            throw error; // Non-retryable error, throw immediately
          }

          // Check if we have attempts left
          if (attempt >= config.maxAttempts) {
            throw error; // Max attempts reached, throw
          }

          // Calculate delay
          let delay = config.delayMs;
          if (config.exponentialBackoff) {
            delay = config.delayMs * Math.pow(2, attempt - 1);
          }

          // Log retry attempt
          console.warn(
            `[@retry] ${String(propertyKey)} failed (attempt ${attempt}/${config.maxAttempts}). ` +
            `Retrying in ${delay}ms...`,
            error
          );

          // Wait before retrying
          await sleep(delay);
        }
      }

      // This should never be reached, but TypeScript requires it
      throw lastError;
    };

    return descriptor;
  };
}
