/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Tests for: enforce-async-on-heavy-methods
 * 
 * Validates that the rule correctly identifies CPU-intensive synchronous methods
 * that should be async or use Web Workers.
 */

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-async-on-heavy-methods');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      decorators: true
    }
  }
});

ruleTester.run('enforce-async-on-heavy-methods', rule, {
  valid: [
    // ✅ VALID: Method is already async
    {
      code: `
        class CalculationService {
          public async calculateHeavy(data: number[]): Promise<number> {
            return data.reduce((sum, val) => sum + val, 0);
          }
        }
      `,
      filename: 'src/services/CalculationService.ts'
    },

    // ✅ VALID: Simple getter (intentionally simple)
    {
      code: `
        class DataService {
          public getState(): GameState {
            return this.state;
          }
        }
      `,
      filename: 'src/services/DataService.ts'
    },

    // ✅ VALID: Method has performance exemption comment
    {
      code: `
        class OptimizedService {
          /** @performance: Intentionally sync, optimized for hot-path */
          public calculate(a: number, b: number): number {
            for (let i = 0; i < 1000; i++) {
              a += b;
            }
            return a;
          }
        }
      `,
      filename: 'src/services/OptimizedService.ts'
    },

    // ✅ VALID: Private method (internal optimization decision)
    {
      code: `
        class InternalService {
          private _processData(data: number[]): number[] {
            return data.map(x => x * 2);
          }
        }
      `,
      filename: 'src/services/InternalService.ts'
    },

    // ✅ VALID: Non-service file (rule doesn't apply)
    {
      code: `
        class DataProcessor {
          public process(data: any[]): any[] {
            return data.map(x => x * 2).filter(x => x > 0);
          }
        }
      `,
      filename: 'src/utils/DataProcessor.ts'
    },

    // ✅ VALID: Low complexity (score < 3)
    {
      code: `
        class SimpleService {
          public process(value: number): number {
            return Math.sqrt(value);
          }
        }
      `,
      filename: 'src/services/SimpleService.ts'
    },

    // ✅ VALID: Single map operation (score = 1, below threshold)
    {
      code: `
        class TransformService {
          public transform(items: Item[]): Item[] {
            return items.map(item => ({ ...item, processed: true }));
          }
        }
      `,
      filename: 'src/services/TransformService.ts'
    },

    // ✅ VALID: Method name indicates it's intentionally fast
    {
      code: `
        class FastService {
          public fastCalculate(data: number[]): number {
            return data.reduce((sum, val) => sum + val, 0);
          }
        }
      `,
      filename: 'src/services/FastService.ts'
    }
  ],

  invalid: [
    // ❌ INVALID: Multiple array operations (map + filter + reduce)
    {
      code: `
        class DataService {
          public processData(data: number[]): number {
            return data
              .map(x => x * 2)
              .filter(x => x > 0)
              .reduce((sum, val) => sum + val, 0);
          }
        }
      `,
      filename: 'src/services/DataService.ts',
      errors: [{ 
          messageId: 'shouldBeAsync'
         }]
    },

    // ❌ INVALID: For loop + array operations
    {
      code: `
        class ProcessingService {
          public process(items: Item[]): Item[] {
            const result = [];
            for (let i = 0; i < items.length; i++) {
              result.push(items[i].transform());
            }
            return result.sort();
          }
        }
      `,
      filename: 'src/services/ProcessingService.ts',
      errors: [{ 
          messageId: 'shouldBeAsync'
         }]
    },

    // ❌ INVALID: JSON parsing + array operations
    {
      code: `
        class ParserService {
          public parseAndProcess(json: string): any[] {
            const data = JSON.parse(json);
            return data.map(x => x.value).filter(x => x > 0);
          }
        }
      `,
      filename: 'src/services/ParserService.ts',
      errors: [
        {
          messageId: 'shouldBeAsync'
        }
      ]
    },

    // ❌ INVALID: Matrix operations (very high severity - Worker suggested)
    {
      code: `
        class MathService {
          public calculateMatrix(matrix: number[][]): number[][] {
            return matrix.map(row => row.map(val => val * 2));
          }
        }
      `,
      filename: 'src/services/MathService.ts',
      errors: [{ 
          messageId: 'shouldBeAsync'
         }]
    },

    // ❌ INVALID: Sorting operation (O(n log n))
    {
      code: `
        class SortService {
          public sortData(data: number[]): number[] {
            return data.sort((a, b) => a - b);
          }
        }
      `,
      filename: 'src/services/SortService.ts',
      errors: [{ 
          messageId: 'shouldBeAsync'
         }]
    },

    // ❌ INVALID: Multiple reduce operations
    {
      code: `
        class AggregationService {
          public aggregate(data: number[]): number {
            const sum = data.reduce((acc, val) => acc + val, 0);
            const product = data.reduce((acc, val) => acc * val, 1);
            return sum + product;
          }
        }
      `,
      filename: 'src/services/AggregationService.ts',
      errors: [
        {
          messageId: 'shouldBeAsync'
        }
      ]
    },

    // ❌ INVALID: Physics calculations (high severity)
    {
      code: `
        class PhysicsService {
          public calculateForces(particles: Particle[]): void {
            for (let i = 0; i < particles.length; i++) {
              const force = this.computePhysics(particles[i]);
              particles[i].applyForce(force);
            }
          }
        }
      `,
      filename: 'src/services/PhysicsService.ts',
      errors: [
        {
          messageId: 'shouldBeAsync'
        }
      ]
    },

    // ❌ INVALID: Heavy computation (multiple array operations)
    {
      code: `
        class HeavyService {
          public complexCalculation(data: number[][]): number {
            return data
              .map(row => row.filter(x => x > 0))
              .reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
          }
        }
      `,
      filename: 'src/services/HeavyService.ts',
      errors: [
        {
          messageId: 'shouldBeAsync'
        }
      ]
    },

    // ❌ INVALID: Recursive method without optimization
    {
      code: `
        class RecursiveService {
          public fibonacci(n: number): number {
            if (n <= 1) return n;
            return this.fibonacci(n - 1) + this.fibonacci(n - 2);
          }
        }
      `,
      filename: 'src/services/RecursiveService.ts',
      errors: [
        {
          messageId: 'shouldBeAsync'
        }
      ]
    }
  ]
});

console.log('✅ All enforce-async-on-heavy-methods tests passed!');
