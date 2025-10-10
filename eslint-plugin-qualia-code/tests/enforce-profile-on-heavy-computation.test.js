/**
 * @fileoverview Tests for enforce-profile-on-heavy-computation rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-profile-on-heavy-computation');

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

ruleTester.run('enforce-profile-on-heavy-computation', rule, {
  valid: [
    // Correctly decorated heavy computation method
    {
      code: `
        class CalculatorService {
          @profile()
          calculateComplexResult(data: number[]) {
            for (const item of data) {
              // complex computation
            }
          }
        }
      `,
      filename: 'src/services/CalculatorService.ts'
    },
    {
      code: `
        class RenderService {
          @profile()
          @measureTime()
          renderFrame() {
            for (let i = 0; i < 1000; i++) {
              // render logic
            }
          }
        }
      `,
      filename: 'src/services/RenderService.ts'
    },
    // Simple method without loops doesn't need @profile
    {
      code: `
        class CalculatorService {
          calculateSum(a: number, b: number) {
            return a + b;
          }
        }
      `,
      filename: 'src/services/CalculatorService.ts'
    },
    // Private methods don't trigger
    {
      code: `
        class ProcessorService {
          private processData() {
            for (let i = 0; i < 100; i++) {}
          }
        }
      `,
      filename: 'src/services/ProcessorService.ts'
    },
    // Lifecycle methods exempt
    {
      code: `
        class EngineService {
          initialize() {
            for (let i = 0; i < 100; i++) {}
          }
        }
      `,
      filename: 'src/services/EngineService.ts'
    },
    // Non-service files
    {
      code: `
        class Component {
          calculateResult() {
            for (let i = 0; i < 100; i++) {}
          }
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class CalculatorService {
          calculateComplexResult(data: number[]) {
            for (const item of data) {
              // complex computation
            }
          }
        }
      `,
      filename: 'src/services/CalculatorService.ts',
      errors: [{
        messageId: 'suggestProfile',
        data: { methodName: 'calculateComplexResult' }
      }]
    },
    {
      code: `
        class ProcessorService {
          processLargeDataset(items: any[]) {
            for (let i = 0; i < items.length; i++) {
              // heavy processing
            }
          }
        }
      `,
      filename: 'src/services/ProcessorService.ts',
      errors: [{
        messageId: 'suggestProfile',
        data: { methodName: 'processLargeDataset' }
      }]
    },
    {
      code: `
        class TransformService {
          transformData(input: any[]) {
            while (input.length > 0) {
              input.pop();
            }
          }
        }
      `,
      filename: 'src/services/TransformService.ts',
      errors: [{
        messageId: 'suggestProfile',
        data: { methodName: 'transformData' }
      }]
    },
    {
      code: `
        class EncryptionService {
          encryptData(data: string) {
            for (let i = 0; i < data.length; i++) {
              // encryption logic
            }
          }
        }
      `,
      filename: 'src/services/EncryptionService.ts',
      errors: [{
        messageId: 'suggestProfile',
        data: { methodName: 'encryptData' }
      }]
    },
    {
      code: `
        class RenderService {
          renderScene() {
            for (let i = 0; i < 1000; i++) {
              // render objects
            }
          }
        }
      `,
      filename: 'src/services/RenderService.ts',
      errors: [{
        messageId: 'suggestProfile',
        data: { methodName: 'renderScene' }
      }]
    }
  ]
});
