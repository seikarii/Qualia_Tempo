/**
 * @fileoverview Tests for no-global-api-calls rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-global-api-calls');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
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
    },
    // Should allow window access in functions decorated with @BrowserOnly
    {
      code: `
        // @BrowserOnly
        function attachToGlobalScope() {
          if (typeof window !== 'undefined') {
            window.QA_DEBUG = {};
          }
        }
      `,
      filename: 'src/services/DebugService.ts'
    },
    // Should allow window access with typeof guard
    {
      code: `
        function getWindowDimensions() {
          if (typeof window !== 'undefined') {
            return { width: window.innerWidth, height: window.innerHeight };
          }
          return { width: 0, height: 0 };
        }
      `,
      filename: 'src/services/WindowService.ts'
    },
    // Should allow window access with double quotes guard
    {
      code: `
        function getWindowDimensions() {
          if (typeof window !== "undefined") {
            return { width: window.innerWidth, height: window.innerHeight };
          }
          return { width: 0, height: 0 };
        }
      `,
      filename: 'src/services/WindowService.ts'
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
    // Should flag window object access without protection
    {
      code: 'const width = window.innerWidth',
      filename: 'src/services/WindowService.ts',
      errors: [{
        messageId: 'noGlobalAccess'
      }]
    },
    // Should flag window access in undecorated functions
    {
      code: `
        function getWindowDimensions() {
          return { width: window.innerWidth, height: window.innerHeight };
        }
      `,
      filename: 'src/services/WindowService.ts',
      errors: [
        { messageId: 'noGlobalAccess' },
        { messageId: 'noGlobalAccess' }
      ]
    },
    // Should flag document access without protection
    {
      code: `
        function getDocumentTitle() {
          return document.title;
        }
      `,
      filename: 'src/services/DocumentService.ts',
      errors: [{
        messageId: 'noGlobalAccess'
      }]
    },
    // Should flag localStorage access without protection
    {
      code: `
        function getStoredValue() {
          return localStorage.getItem('key');
        }
      `,
      filename: 'src/services/StorageService.ts',
      errors: [{
        messageId: 'noGlobalApiCall'
      }]
    }
  ]
});

console.log('✅ no-global-api-calls tests passed');