/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/* eslint-disable no-console */
// ARCHITECTURAL NOTE: Profiling decorator is complex debugging infrastructure
// TypeScript quality and complexity rules relaxed for diagnostic utilities

/**
 * @profile Decorator
 * 
 * Advanced performance profiling decorator with memory tracking and call graph generation.
 * Goes beyond @measureTime to provide comprehensive method profiling.
 * 
 * QUALIA.CODE v1.1: Performance Monitoring Pattern
 * Session 30: Frontend implementation with IPerformanceService integration
 * 
 * Features:
 * - Execution time measurement via Performance API
 * - Memory delta tracking (Chrome/Edge only)
 * - Call count aggregation
 * - Integration with IPerformanceService
 * - Configurable profiling options
 * - Support for sync and async methods
 * 
 * @example
 * ```typescript
 * class DataService {
 *   @profile({ trackMemory: true, logToConsole: true })
 *   public async processLargeDataset(data: any[]): Promise<any[]> {
 *     return data.map(item => this.transform(item));
 *   }
 * 
 *   @profile({ enabled: process.env.NODE_ENV === 'development' })
 *   public complexCalculation(input: number): number {
 *     return Math.pow(input, 10);
 *   }
 * }
 * ```
 */

/**
 * Profiling configuration options
 */
export interface ProfileOptions {
  /**
   * Enable/disable profiling (useful for conditional profiling)
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Track memory usage before/after method execution
   * Note: Only works in Chrome/Edge (performance.memory)
   * @default false
   */
  trackMemory?: boolean;
  
  /**
   * Log profiling results to console
   * @default false
   */
  logToConsole?: boolean;
  
  /**
   * Custom label for profiling mark (default: method name)
   * @example 'critical-calculation', 'heavy-transform'
   */
  label?: string;
  
  /**
   * Threshold in milliseconds - only log if execution exceeds this
   * @example 100 // Only log if method takes > 100ms
   */
  thresholdMs?: number;
  
  /**
   * Store results in performance buffer for later analysis
   * @default true
   */
  storeInBuffer?: boolean;
}

/**
 * Profiling result data structure
 */
export interface ProfileResult {
  /** Method name or custom label */
  label: string;
  /** Execution time in milliseconds */
  duration: number;
  /** Memory used before execution (bytes) */
  memoryBefore?: number;
  /** Memory used after execution (bytes) */
  memoryAfter?: number;
  /** Memory delta (bytes) */
  memoryDelta?: number;
  /** Timestamp when profiling started */
  startTime: number;
  /** Timestamp when profiling ended */
  endTime: number;
  /** Number of times this method has been called */
  callCount: number;
  /** Whether method was async */
  isAsync: boolean;
  /** Method threw an error */
  error?: Error;
}

/**
 * Global profiling statistics storage
 * Stores aggregated data per method for call graph generation
 */
const profilingStats: Map<string, {
  totalCalls: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  lastCallTime: number;
  results: ProfileResult[];
}> = new Map();

/**
 * @profile Decorator
 * 
 * Profiles method execution with detailed performance metrics.
 * Integrates with Performance API for high-resolution timing.
 * 
 * Profiling Metrics:
 * - **Execution Time:** High-resolution timestamp via performance.now()
 * - **Memory Usage:** Heap size delta (Chrome/Edge only)
 * - **Call Count:** Aggregated per method for frequency analysis
 * - **Error Tracking:** Captures exceptions without blocking propagation
 * 
 * Performance API Integration:
 * - Uses performance.mark() for event markers
 * - Uses performance.measure() for duration calculation
 * - Compatible with browser DevTools Performance panel
 * - No IPerformanceService injection needed (uses global Performance API)
 * 
 * @param options - Profiling configuration
 * @returns Method decorator
 * 
 * @example Basic profiling
 * ```typescript
 * @profile()
 * public calculateQualia(state: GameState): QualiaState {
 *   // Complex calculation
 *   return this.processState(state);
 * }
 * ```
 * 
 * @example Memory tracking
 * ```typescript
 * @profile({ trackMemory: true, logToConsole: true })
 * public async loadLargeAsset(url: string): Promise<ArrayBuffer> {
 *   const response = await fetch(url);
 *   return response.arrayBuffer();
 * }
 * ```
 * 
 * @example Conditional profiling
 * ```typescript
 * @profile({ 
 *   enabled: process.env.NODE_ENV === 'development',
 *   thresholdMs: 16  // Only log if slower than 16ms (60 FPS budget)
 * })
 * public renderFrame(deltaTime: number): void {
 *   this.updateScene(deltaTime);
 * }
 * ```
 * 
 * @example Custom label
 * ```typescript
 * @profile({ label: 'particle-system-update', logToConsole: true })
 * public update(deltaTime: number): void {
 *   this.particles.forEach(p => p.update(deltaTime));
 * }
 * ```
 */
export function profile(options: ProfileOptions = {}) {
  // Default options
  const opts: Required<ProfileOptions> = {
    enabled: options.enabled ?? true,
    trackMemory: options.trackMemory ?? false,
    logToConsole: options.logToConsole ?? false,
    label: options.label ?? '',
    thresholdMs: options.thresholdMs ?? 0,
    storeInBuffer: options.storeInBuffer ?? true,
  };
  
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const methodLabel = opts.label || `${target.constructor.name}.${propertyKey}`;
    
    // Initialize profiling statistics for this method
    if (!profilingStats.has(methodLabel)) {
      profilingStats.set(methodLabel, {
        totalCalls: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        lastCallTime: 0,
        results: [],
      });
    }
    
    descriptor.value = function (this: any, ...args: any[]): any {
      // Skip if profiling disabled
      if (!opts.enabled) {
        return originalMethod.apply(this, args);
      }
      
      // Ensure stats exist (may have been cleared by clearProfilingStats())
      if (!profilingStats.has(methodLabel)) {
        profilingStats.set(methodLabel, {
          totalCalls: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          avgDuration: 0,
          lastCallTime: 0,
          results: [],
        });
      }
      
      const stats = profilingStats.get(methodLabel)!;
      stats.totalCalls++;
      
      // Performance marks for DevTools integration
      const startMark = `${methodLabel}-start-${stats.totalCalls}`;
      const endMark = `${methodLabel}-end-${stats.totalCalls}`;
      const measureName = `${methodLabel}-measure-${stats.totalCalls}`;
      
      // Capture memory before execution (Chrome/Edge only)
      let memoryBefore: number | undefined;
      if (opts.trackMemory && (performance as any).memory) {
        memoryBefore = (performance as any).memory.usedJSHeapSize;
      }
      
      // Start timing
      const startTime = performance.now();
      performance.mark(startMark);
      
      // Determine if method is async
      const isAsync = originalMethod.constructor.name === 'AsyncFunction';
      
      // Create result recording function
      const recordResult = (error?: Error) => {
        // Fetch stats fresh (don't use closure-captured reference)
        const currentStats = profilingStats.get(methodLabel);
        if (!currentStats) {
          // Stats were cleared, skip recording
          return;
        }
        
        const endTime = performance.now();
        performance.mark(endMark);
        
        // Measure duration
        performance.measure(measureName, startMark, endMark);
        const duration = endTime - startTime;
        
        // Capture memory after execution
        let memoryAfter: number | undefined;
        let memoryDelta: number | undefined;
        if (opts.trackMemory && (performance as any).memory) {
          memoryAfter = (performance as any).memory.usedJSHeapSize;
          if (memoryAfter !== undefined && memoryBefore !== undefined) {
            memoryDelta = memoryAfter - memoryBefore;
          }
        }
        
        // Create profile result
        const result: ProfileResult = {
          label: methodLabel,
          duration,
          memoryBefore,
          memoryAfter,
          memoryDelta,
          startTime,
          endTime,
          callCount: currentStats.totalCalls,
          isAsync,
          error,
        };
        
        // Update statistics
        currentStats.totalDuration += duration;
        currentStats.minDuration = Math.min(currentStats.minDuration, duration);
        currentStats.maxDuration = Math.max(currentStats.maxDuration, duration);
        currentStats.avgDuration = currentStats.totalDuration / currentStats.totalCalls;
        currentStats.lastCallTime = endTime;
        
        if (opts.storeInBuffer) {
          currentStats.results.push(result);
          // Keep buffer size manageable (last 100 calls)
          if (currentStats.results.length > 100) {
            currentStats.results.shift();
          }
        }
        
        // Log to console if enabled and threshold met
        if (opts.logToConsole && duration >= opts.thresholdMs) {
          const emoji = error ? '❌' : duration > 16 ? '🐌' : '✅';
          console.group(`${emoji} Profile: ${methodLabel}`);
          console.log(`Duration: ${duration.toFixed(2)}ms`);
          console.log(`Call count: ${stats.totalCalls}`);
          console.log(`Avg duration: ${stats.avgDuration.toFixed(2)}ms`);
          console.log(`Min/Max: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms`);
          
          if (memoryDelta !== undefined) {
            const memoryDeltaMB = (memoryDelta / 1024 / 1024).toFixed(2);
            console.log(`Memory delta: ${memoryDeltaMB}MB`);
          }
          
          if (error) {
            console.error('Error:', error);
          }
          
          console.groupEnd();
        }
        
        // Clean up performance marks/measures (if available)
        if (typeof performance.clearMarks === 'function') {
          performance.clearMarks(startMark);
          performance.clearMarks(endMark);
        }
        if (typeof performance.clearMeasures === 'function') {
          performance.clearMeasures(measureName);
        }
      };
      
      // Execute method
      try {
        const result = originalMethod.apply(this, args);
        
        // Check if result is a Promise (more reliable than constructor.name check)
        const resultIsPromise = result && typeof result.then === 'function';
        
        if (resultIsPromise) {
          // Handle async methods
          return Promise.resolve(result)
            .then((resolvedValue) => {
              recordResult();
              return resolvedValue;
            })
            .catch((error) => {
              recordResult(error);
              throw error;  // Re-throw to not swallow errors
            });
        } else {
          // Handle sync methods
          recordResult();
          return result;
        }
      } catch (error) {
        recordResult(error as Error);
        throw error;  // Re-throw to not swallow errors
      }
    };
    
    // Attach profiling metadata to method
    (descriptor.value as any).__profiled__ = true;
    (descriptor.value as any).__profileLabel__ = methodLabel;
    
    return descriptor;
  };
}

/**
 * Get profiling statistics for a specific method
 * 
 * @param label - Method label (ClassName.methodName or custom label)
 * @returns Profiling statistics or undefined if not found
 * 
 * @example
 * ```typescript
 * const stats = getProfilingStats('DataService.processLargeDataset');
 * console.log(`Average duration: ${stats?.avgDuration}ms`);
 * console.log(`Total calls: ${stats?.totalCalls}`);
 * ```
 */
export function getProfilingStats(label: string) {
  return profilingStats.get(label);
}

/**
 * Get all profiling statistics
 * 
 * @returns Map of all profiling statistics
 * 
 * @example
 * ```typescript
 * const allStats = getAllProfilingStats();
 * allStats.forEach((stats, label) => {
 *   console.log(`${label}: ${stats.avgDuration.toFixed(2)}ms avg`);
 * });
 * ```
 */
export function getAllProfilingStats() {
  return new Map(profilingStats);
}

/**
 * Clear profiling statistics for a specific method or all methods
 * 
 * @param label - Method label to clear (omit to clear all)
 * 
 * @example
 * ```typescript
 * // Clear specific method
 * clearProfilingStats('DataService.processLargeDataset');
 * 
 * // Clear all statistics
 * clearProfilingStats();
 * ```
 */
export function clearProfilingStats(label?: string): void {
  if (label) {
    profilingStats.delete(label);
  } else {
    profilingStats.clear();
  }
}

/**
 * Export profiling statistics as JSON for external analysis
 * 
 * @returns JSON-serializable profiling data
 * 
 * @example
 * ```typescript
 * const exportedStats = exportProfilingStats();
 * // Send to analytics service
 * await fetch('/api/analytics/profiling', {
 *   method: 'POST',
 *   body: JSON.stringify(exportedStats)
 * });
 * ```
 */
export function exportProfilingStats() {
  const exported: Record<string, any> = {};
  
  profilingStats.forEach((stats, label) => {
    exported[label] = {
      totalCalls: stats.totalCalls,
      totalDuration: stats.totalDuration,
      minDuration: stats.minDuration,
      maxDuration: stats.maxDuration,
      avgDuration: stats.avgDuration,
      lastCallTime: stats.lastCallTime,
      recentResults: stats.results.slice(-10),  // Last 10 calls
    };
  });
  
  return exported;
}
