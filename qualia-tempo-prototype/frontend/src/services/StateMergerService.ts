/**
 * QUALIA.CODE v1.1 - StateMergerService
 * 
 * PURPOSE: Provides deep merge capabilities to eliminate shallow merge anti-patterns in state management.
 * 
 * PROBLEM SOLVED:
 * Shallow merge ({ ...target, ...source }) causes data loss in nested objects:
 *   target = { a: 1, nested: { x: 10, y: 20 } }
 *   source = { nested: { x: 99 } }
 *   shallow = { a: 1, nested: { x: 99 } }  ❌ LOST y!
 *   deep    = { a: 1, nested: { x: 99, y: 20 } } ✅ Preserved y!
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Stateless service: Pure function with no side effects
 * - IoC/DI: Decorated with @injectable, injected logger
 * - Type-safe: Generic method signature with compile-time checks
 * - Logging: All operations logged for debugging
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IStateMergerService } from './interfaces/IStateMergerService';
import type { ILogger } from './interfaces/ILogger';
import { logMethod } from '../utils/decorators';

/**
 * StateMergerService: Recursive deep merge implementation
 * 
 * ALGORITHM:
 * 1. For each source object (left-to-right):
 *    a. For each key in source:
 *       - If value is undefined: SKIP (don't overwrite target)
 *       - If target[key] and source[key] are both plain objects: RECURSE
 *       - Otherwise: REPLACE target[key] with source[key]
 * 2. Return new immutable object
 * 
 * COMPLEXITY: O(n*m) where n = total keys across all levels, m = depth
 */
@injectable()
export class StateMergerService implements IStateMergerService {
  constructor(
    @inject(TYPES.ILogger) private readonly _logger: ILogger
  ) {
    this._logger.info('StateMergerService: Initialized');
  }

  /**
   * Deep merge multiple source objects into target
   * 
   * @template T - Type of target object
   * @param target - Base object (not mutated)
   * @param sources - Partial objects to merge (applied left-to-right)
   * @returns New deeply merged object
   */
  @logMethod
  public deepMerge<T extends object>(
    target: T,
    ...sources: Partial<T>[]
  ): T {
    this._logger.debug('StateMergerService.deepMerge: Starting deep merge', {
      targetKeys: Object.keys(target as object).length,
      sourcesCount: sources.length,
    });

    // Start with a shallow copy of target (to avoid mutation)
    let result: T = { ...target };

    // Apply each source in order (left-to-right)
    for (const source of sources) {
      if (!source) {
        this._logger.warn('StateMergerService.deepMerge: Encountered null/undefined source, skipping');
        continue;
      }

      result = this.mergeObjects(result as Record<string, unknown>, source as Record<string, unknown>) as T;
    }

    this._logger.debug('StateMergerService.deepMerge: Completed deep merge', {
      resultKeys: Object.keys(result as object).length,
    });

    return result;
  }

  /**
   * Recursively merge two objects
   * 
   * RULES:
   * - undefined in source: SKIP (preserve target value)
   * - Both plain objects: RECURSE
   * - Both arrays: REPLACE (Redux convention)
   * - Otherwise: REPLACE
   * 
   * @private
   */
  private mergeObjects<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = { ...target };

    for (const key in source) {
      // Type assertion needed for hasOwnProperty check
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

      const sourceValue = source[key];
      const targetValue = result[key];

      // Rule 1: undefined in source = skip (preserve target)
      if (sourceValue === undefined) {
        continue;
      }

      // Rule 2: Both are plain objects = recurse
      if (
        this.isPlainObject(targetValue) &&
        this.isPlainObject(sourceValue)
      ) {
        result[key] = this.mergeObjects(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
        continue;
      }

      // Rule 3: Both are arrays = replace (don't merge array items)
      // Rule 4: Otherwise = replace
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }

    return result;
  }

  /**
   * Type guard: Check if value is a plain object (not array, not null, not Date, etc.)
   * 
   * @private
   */
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    // Exclude special objects like Date, RegExp, etc.
    if (value.constructor !== Object) return false;
    return true;
  }
}
