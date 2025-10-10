/**
 * @fileoverview Tests for enforce-measure-time-on-logic-services rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-measure-time-on-logic-services');

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

ruleTester.run('enforce-measure-time-on-logic-services', rule, {
  valid: [
    // Correctly decorated logic method
    {
      code: `
        class ViewLogicService {
          @measureTime()
          calculateVisuals(state: GameState) {
            return this.processState(state);
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },
    {
      code: `
        class GameplayMechanicsService {
          @measureTime()
          @logMethod()
          processGameTick(delta: number) {
            // complex logic
          }
        }
      `,
      filename: 'src/services/GameplayMechanicsService.ts'
    },
    // Simple getter doesn't need @measureTime
    {
      code: `
        class ViewLogicService {
          getState() {
            return this.state;
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },
    // Private methods don't trigger
    {
      code: `
        class CalculatorService {
          private calculateInternal() {
            // complex logic
          }
        }
      `,
      filename: 'src/services/CalculatorService.ts'
    },
    // Lifecycle methods exempt
    {
      code: `
        class ViewLogicService {
          initialize() {}
          cleanup() {}
        }
      `,
      filename: 'src/services/ViewLogicService.ts'
    },
    // Non-logic services not checked
    {
      code: `
        class HttpService {
          fetchData() {}
        }
      `,
      filename: 'src/services/HttpService.ts'
    }
  ],

  invalid: [
    {
      code: `
        class ViewLogicService {
          calculateVisuals(state: GameState) {
            return this.processState(state);
          }
        }
      `,
      filename: 'src/services/ViewLogicService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'calculateVisuals' }
      }]
    },
    {
      code: `
        class GameplayMechanicsService {
          processGameTick(delta: number) {
            // complex logic
          }
        }
      `,
      filename: 'src/services/GameplayMechanicsService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'processGameTick' }
      }]
    },
    {
      code: `
        class CalculatorService {
          computeResult(input: any) {
            return input * 2;
          }
        }
      `,
      filename: 'src/services/CalculatorService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'computeResult' }
      }]
    },
    {
      code: `
        class ProcessorService {
          processData() {}
        }
      `,
      filename: 'src/services/ProcessorService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'processData' }
      }]
    },
    {
      code: `
        class EngineService {
          update(delta: number) {}
        }
      `,
      filename: 'src/services/EngineService.ts',
      errors: [{
        messageId: 'suggestMeasureTime',
        data: { methodName: 'update' }
      }]
    }
  ]
});
