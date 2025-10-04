/**
 * QUALIA.CODE v1.1 - StateMergerService Test Suite
 * Comprehensive tests for deep merge functionality
 * 
 * Test Coverage:
 * - Immutability guarantees
 * - Nested object merging
 * - Array replacement behavior
 * - Primitive handling (null, undefined, etc.)
 * - Multiple source merging order
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer } from '../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IStateMergerService } from '../interfaces/IStateMergerService';

describe('StateMergerService', () => {
  let container: Container;
  let stateMerger: IStateMergerService;

  beforeEach(() => {
    container = createTestContainer();
    stateMerger = container.get<IStateMergerService>(TYPES.IStateMergerService);
  });

  describe('Immutability', () => {
    it('should never mutate the target object', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 } };
      const originalTarget = JSON.parse(JSON.stringify(target));

      stateMerger.deepMerge(target, source);

      expect(target).toEqual(originalTarget);
      expect(target.b).toEqual({ c: 2 }); // Nested object unchanged
    });

    it('should never mutate source objects', () => {
      const target = { a: 1 };
      const source1 = { b: 2 };
      const source2 = { c: 3 };
      const originalSource1 = JSON.parse(JSON.stringify(source1));
      const originalSource2 = JSON.parse(JSON.stringify(source2));

      stateMerger.deepMerge(target, source1, source2);

      expect(source1).toEqual(originalSource1);
      expect(source2).toEqual(originalSource2);
    });

    it('should return a new object reference', () => {
      const target = { a: 1 };
      const source = { b: 2 };

      const result = stateMerger.deepMerge(target, source);

      expect(result).not.toBe(target);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('Nested Object Merging', () => {
    it('should merge simple nested objects', () => {
      const target = { a: 1, nested: { b: 2, c: 3 } };
      const source = { nested: { b: 20, d: 4 } };

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({
        a: 1,
        nested: { b: 20, c: 3, d: 4 },
      });
    });

    it('should merge deeply nested objects (5 levels)', () => {
      const target = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { value: 'original', keep: true },
              },
            },
          },
        },
      };
      const source = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { value: 'updated', newKey: 'added' },
              },
            },
          },
        },
      };

      const result = stateMerger.deepMerge(target, source);

      expect(result.level1.level2.level3.level4.level5).toEqual({
        value: 'updated',
        keep: true,
        newKey: 'added',
      });
    });

    it('should preserve unrelated nested branches', () => {
      const target = {
        branch1: { a: 1, b: 2 },
        branch2: { c: 3, d: 4 },
      };
      const source = {
        branch1: { a: 10 },
      };

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({
        branch1: { a: 10, b: 2 },
        branch2: { c: 3, d: 4 },
      });
    });

    it('should handle complex nested structures with mixed types', () => {
      const target = {
        user: {
          id: 1,
          name: 'Alice',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        items: [1, 2, 3],
      };
      const source = {
        user: {
          name: 'Bob',
          settings: {
            theme: 'light',
          },
        },
        items: [4, 5],
      };

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({
        user: {
          id: 1,
          name: 'Bob',
          settings: {
            theme: 'light',
            notifications: true,
          },
        },
        items: [4, 5], // Arrays replaced, not merged
      });
    });
  });

  describe('Array Replacement Behavior', () => {
    it('should replace arrays completely (Redux convention)', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };

      const result = stateMerger.deepMerge(target, source);

      expect(result.items).toEqual([4, 5]);
      expect(result.items).not.toEqual([1, 2, 3, 4, 5]); // Not concatenated
    });

    it('should replace arrays with empty arrays', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [] };

      const result = stateMerger.deepMerge(target, source);

      expect(result.items).toEqual([]);
    });

    it('should replace nested arrays', () => {
      const target = {
        data: {
          list: [{ id: 1 }, { id: 2 }],
        },
      };
      const source = {
        data: {
          list: [{ id: 3 }],
        },
      };

      const result = stateMerger.deepMerge(target, source);

      expect(result.data.list).toEqual([{ id: 3 }]);
    });

    it('should handle arrays of different types', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: ['a', 'b'] };

      const result = stateMerger.deepMerge(target, source);

      expect(result.items).toEqual(['a', 'b']);
    });
  });

  describe('Primitive Handling', () => {
    it('should preserve target values when source has undefined', () => {
      const target = { a: 1, b: 2, c: 3 };
      const source = { b: undefined };

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should replace with null from source', () => {
      const target = { a: 1, b: 2 };
      const source = { b: null };

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: null });
    });

    it('should handle string values', () => {
      const target = { message: 'hello' };
      const source = { message: 'world' };

      const result = stateMerger.deepMerge(target, source);

      expect(result.message).toBe('world');
    });

    it('should handle number values', () => {
      const target = { count: 5 };
      const source = { count: 10 };

      const result = stateMerger.deepMerge(target, source);

      expect(result.count).toBe(10);
    });

    it('should handle boolean values', () => {
      const target = { enabled: false };
      const source = { enabled: true };

      const result = stateMerger.deepMerge(target, source);

      expect(result.enabled).toBe(true);
    });

    it('should handle zero and empty string as valid values', () => {
      const target = { count: 5, name: 'Alice' };
      const source = { count: 0, name: '' };

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({ count: 0, name: '' });
    });

    it('should handle false as a valid value', () => {
      const target = { enabled: true };
      const source = { enabled: false };

      const result = stateMerger.deepMerge(target, source);

      expect(result.enabled).toBe(false);
    });
  });

  describe('Multiple Source Merging', () => {
    it('should merge multiple sources in left-to-right order', () => {
      const target = { a: 1 };
      const source1 = { b: 2 };
      const source2 = { c: 3 };
      const source3 = { d: 4 };

      const result = stateMerger.deepMerge(target, source1, source2, source3);

      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it('should apply later sources over earlier ones', () => {
      const target = { a: 1 };
      const source1 = { a: 2, b: 2 };
      const source2 = { a: 3, c: 3 };

      const result = stateMerger.deepMerge(target, source1, source2);

      expect(result).toEqual({ a: 3, b: 2, c: 3 });
    });

    it('should handle nested conflicts with multiple sources', () => {
      const target = { nested: { a: 1, b: 2 } };
      const source1 = { nested: { a: 10 } };
      const source2 = { nested: { b: 20, c: 30 } };

      const result = stateMerger.deepMerge(target, source1, source2);

      expect(result.nested).toEqual({ a: 10, b: 20, c: 30 });
    });

    it('should handle mixed types across multiple sources', () => {
      const target = { value: 'string' };
      const source1 = { value: 123 };
      const source2 = { value: true };

      const result = stateMerger.deepMerge(target, source1, source2);

      expect(result.value).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty source objects', () => {
      const target = { a: 1, b: 2 };
      const source = {};

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty target object', () => {
      const target = {};
      const source = { a: 1, b: 2 };

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle merging when both are empty', () => {
      const target = {};
      const source = {};

      const result = stateMerger.deepMerge(target, source);

      expect(result).toEqual({});
    });

    it('should handle Date objects (as non-plain objects)', () => {
      const now = new Date();
      const target = { timestamp: new Date(0) };
      const source = { timestamp: now };

      const result = stateMerger.deepMerge(target, source);

      expect(result.timestamp).toBe(now);
    });

    it('should handle objects with prototype chain', () => {
      class CustomClass {
        constructor(public value: number) {}
      }
      const target = { obj: new CustomClass(1) };
      const source = { obj: new CustomClass(2) };

      const result = stateMerger.deepMerge(target, source);

      expect(result.obj.value).toBe(2);
      expect(result.obj).toBeInstanceOf(CustomClass);
    });

    it('should handle circular references gracefully (by treating as non-plain)', () => {
      const target: Record<string, unknown> = { a: 1 };
      const source: Record<string, unknown> = { b: 2 };
      source.circular = source; // Create circular reference

      // Should not throw, should treat circular as primitive replacement
      const result = stateMerger.deepMerge(target, source);

      expect(result.a).toBe(1);
      expect(result.b).toBe(2);
      expect(result.circular).toBe(source);
    });
  });

  describe('GameState Realistic Scenarios', () => {
    it('should handle partial player state updates', () => {
      const target = {
        player: {
          health: 100,
          position: { x: 5, y: 5 },
          combo: 10,
          score: 1000,
        },
      };
      const source = {
        player: {
          health: 90,
        },
      };

      const result = stateMerger.deepMerge(target, source);

      expect(result.player).toEqual({
        health: 90,
        position: { x: 5, y: 5 },
        combo: 10,
        score: 1000,
      });
    });

    it('should handle combatData noteMap updates', () => {
      const target = {
        combatData: {
          noteMap: [
            { id: '1', state: 'pending', timestamp: 100 },
            { id: '2', state: 'pending', timestamp: 200 },
          ],
        },
      };
      const source = {
        combatData: {
          noteMap: [
            { id: '1', state: 'hit', timestamp: 100 },
            { id: '2', state: 'pending', timestamp: 200 },
          ],
        },
      };

      const result = stateMerger.deepMerge(target, source);

      expect(result.combatData.noteMap).toEqual(source.combatData.noteMap);
    });

    it('should handle qualiaState partial updates', () => {
      const target = {
        qualiaState: {
          intensity: 0.5,
          precision: 0.7,
          aggression: 0.3,
          flow: 0.6,
          chaos: 0.2,
          recovery: 0.8,
          transcendence: 0.1,
        },
      };
      const source = {
        qualiaState: {
          intensity: 0.8,
          precision: 0.9,
        },
      };

      const result = stateMerger.deepMerge(target, source);

      expect(result.qualiaState).toEqual({
        intensity: 0.8,
        precision: 0.9,
        aggression: 0.3,
        flow: 0.6,
        chaos: 0.2,
        recovery: 0.8,
        transcendence: 0.1,
      });
    });
  });
});
