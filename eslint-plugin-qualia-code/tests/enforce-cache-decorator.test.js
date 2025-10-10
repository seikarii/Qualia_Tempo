'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-cache-decorator');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      experimentalDecorators: true
    }
  }
});

ruleTester.run('enforce-cache-decorator', rule, {
  valid: [
    // Method with @cache
    {
      code: `
        class ViewLogicService {
          @cache({ ttlMs: 16 })
          public getBossVisuals(state: GameState): BossVisuals {
            return this.calculateBossPosition(state);
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },

    // Method with @memoize
    {
      code: `
        class QualiaStateCalculatorService {
          @memoize
          public calculateIntensity(x: number): number {
            return Math.sqrt(x);
          }
        }
      `,
      filename: 'src/services/QualiaStateCalculatorService.ts'
    },

    // Non-deterministic (Date.now)
    {
      code: `
        class ViewLogicService {
          public getTimestamp(): number {
            return Date.now();
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },

    // Non-deterministic (Math.random)
    {
      code: `
        class Service {
          public calculateRandom(): number {
            return Math.random();
          }
        }
      `,
      filename: 'src/services/Service.ts'
    },

    // Non-deterministic (performance.now)
    {
      code: `
        class Service {
          public getPerformanceTime(): number {
            return performance.now();
          }
        }
      `,
      filename: 'src/services/Service.ts'
    },

    // No-cache comment exemption
    {
      code: `
        class ViewLogicService {
          // no-cache: always fresh data needed
          public calculateLive(state: GameState): Vector3 {
            return new Vector3(state.x, state.y, state.z);
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },

    // Private method (exempt)
    {
      code: `
        class ViewLogicService {
          private calculateInternal(state: GameState): any {
            return state.value * 2;
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },

    // Not a calculation method
    {
      code: `
        class ViewLogicService {
          public render(state: GameState): void {
            console.log(state);
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },

    // Non-critical service with non-calculation method
    {
      code: `
        class RandomService {
          public process(): void {
            this.data = [];
          }
        }
      `,
      filename: 'src/services/RandomService.ts'
    },

    // Test file (skipped)
    {
      code: `
        class ViewLogicService {
          public calculateSomething(): number {
            return 42;
          }
        }
      `,
      filename: 'src/services/ViewLogicService.test.ts'
    },
  ],

  invalid: [
    // Critical service (ViewLogicService) - uses frequentCalculation
    {
      code: `
        class ViewLogicService {
          public getBossVisuals(state: GameState): BossVisuals {
            return this.calculateBossPosition(state);
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts',
      errors: [{
        messageId: 'frequentCalculation',
        data: {
          methodName: 'getBossVisuals',
          serviceName: 'ViewLogicService'
        }
      }]
    },

    // Critical service (QualiaStateCalculatorService) - uses frequentCalculation
    {
      code: `
        class QualiaStateCalculatorService {
          public calculateIntensity(x: number): number {
            return Math.sqrt(x);
          }
        }
      `,
      filename: 'src/services/QualiaStateCalculatorService.ts',
      errors: [{
        messageId: 'frequentCalculation',
        data: {
          methodName: 'calculateIntensity',
          serviceName: 'QualiaStateCalculatorService'
        }
      }]
    },

    // Critical service with compute method
    {
      code: `
        class ViewLogicService {
          public computeOffset(x: number): number {
            return x * 2;
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts',
      errors: [{
        messageId: 'frequentCalculation',
        data: {
          methodName: 'computeOffset',
          serviceName: 'ViewLogicService'
        }
      }]
    },

    // Non-critical service with calculate method - uses suggestCache
    {
      code: `
        class OtherService {
          public calculateValue(x: number): number {
            return x * 2;
          }
        }
      `,
      filename: 'src/services/OtherService.ts',
      errors: [{
        messageId: 'suggestCache',
        data: {
          methodName: 'calculateValue'
        }
      }]
    },

    // Critical service with transform method
    {
      code: `
        class QualiaStateCalculatorService {
          public transformState(raw: any): any {
            return { ...raw, modified: true };
          }
        }
      `,
      filename: 'src/services/QualiaStateCalculatorService.ts',
      errors: [{
        messageId: 'frequentCalculation',
        data: {
          methodName: 'transformState',
          serviceName: 'QualiaStateCalculatorService'
        }
      }]
    },

    // Critical service (CoordinateSystemService)
    {
      code: `
        class CoordinateSystemService {
          public convertToScreen(x: number, y: number): Vector2 {
            return new Vector2(x, y);
          }
        }
      `,
      filename: 'src/services/CoordinateSystemService.ts',
      errors: [{
        messageId: 'frequentCalculation',
        data: {
          methodName: 'convertToScreen',
          serviceName: 'CoordinateSystemService'
        }
      }]
    },
  ]
});
