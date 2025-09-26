/**
 * @fileoverview Tests for no-global-api-calls rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-global-api-calls');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
});

ruleTester.run('no-global-api-calls', rule, {
  valid: [
    // Should allow global API usage outside services folder
    {
      code: 'fetch("/api/data")',
      filename: 'src/components/MyComponent.tsx'
    },
    {
      code: 'setTimeout(() => {}, 1000)',
      filename: 'src/utils/helpers.ts'
    },
    // Should allow usage of abstracted services within services
    {
      code: 'this.httpService.get("/api/data")',
      filename: 'src/services/MyService.ts'
    },
    {
      code: 'this.timerService.setTimeout(() => {}, 1000)',
      filename: 'src/services/MyService.ts'
    }
    // Note: Type imports need @typescript-eslint/parser to test properly
  ],

  invalid: [
    // Should flag direct fetch usage in services
    {
      code: 'async function test() { const response = await fetch("/api/data"); }',
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'noGlobalApiCall'
      }]
    },
    // Should flag setTimeout usage in services
    {
      code: 'const id = setTimeout(() => console.log("hello"), 1000)',
      filename: 'src/services/TimingService.ts',
      errors: [{
        messageId: 'noGlobalApiCall'
      }]
    },
    // Should flag localStorage usage in services
    {
      code: 'const value = localStorage.getItem("key")',
      filename: 'src/services/StorageService.ts',
      errors: [{
        messageId: 'noGlobalApiCall'
      }]
    },
    // Should flag window object access
    {
      code: 'const width = window.innerWidth',
      filename: 'src/services/WindowService.ts',
      errors: [{
        messageId: 'noGlobalAccess'
      }]
    },
    // Should flag XMLHttpRequest usage
    {
      code: 'const xhr = new XMLHttpRequest()',
      filename: 'src/services/LegacyService.ts',
      errors: [{
        messageId: 'noGlobalApiCall'
      }]
    },
    // Should flag member expression calls
    {
      code: 'window.fetch("/api/data")',
      filename: 'src/services/MyService.ts',
      errors: [{
        messageId: 'noGlobalAccess'
      }]
    }
  ]
});

console.log('✅ no-global-api-calls tests passed');