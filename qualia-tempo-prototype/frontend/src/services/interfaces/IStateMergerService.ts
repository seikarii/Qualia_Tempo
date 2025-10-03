/**
 * QUALIA.CODE v1.1 - IStateMergerService Interface
 * 
 * PURPOSE: Provides deep merge capabilities for state management to eliminate shallow merge anti-patterns.
 * 
 * RATIONALE:
 * - Shallow merge ({ ...target, ...source }) only merges top-level keys, causing data loss in nested objects.
 * - Deep merge recursively merges nested structures, preserving data integrity.
 * - Encapsulated in a service for reusability, testability, and compliance with IoC principles.
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Single Responsibility: Only handles state merging logic.
 * - Stateless: Pure function service with no internal state.
 * - Type-Safe: Generic signature ensures compile-time type checking.
 */

/**
 * Service interface for deep merging of state objects
 * 
 * @interface IStateMergerService
 */
export interface IStateMergerService {
  /**
   * Deep merge multiple source objects into a target object
   * 
   * BEHAVIOR:
   * - Recursively merges nested objects
   * - Arrays are replaced, not merged (following Redux best practices)
   * - Primitives (string, number, boolean, null) are replaced
   * - Undefined values in sources are ignored (won't overwrite target)
   * - Immutable: Returns new object, never mutates target
   * 
   * COMPLEXITY: O(n*m) where n = number of keys, m = depth of nesting
   * 
   * @template T - Type of the target object (must extend object)
   * @param target - Base object to merge into (not mutated)
   * @param sources - One or more partial objects to merge from (applied left-to-right)
   * @returns New object with deeply merged properties
   * 
   * @example
   * const target = { a: 1, b: { c: 2, d: 3 } };
   * const source = { b: { c: 99 } };
   * const result = deepMerge(target, source);
   * // Result: { a: 1, b: { c: 99, d: 3 } }
   * // Shallow merge would give: { a: 1, b: { c: 99 } } - LOST d!
   */
  deepMerge<T extends object>(
    target: T,
    ...sources: Partial<T>[]
  ): T;
}
