/**
 * @fileoverview Tests for no-direct-service-instantiation rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-direct-service-instantiation');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-direct-service-instantiation', rule, {
  valid: [
    // Allowed in CompositionRoot
    {
      code: 'const service = new QualiaService();',
      filename: 'CompositionRoot.ts'
    },
    {
      code: 'const service = new BackendSyncService();',
      filename: '/path/to/CompositionRoot.tsx'
    },
    // Non-service instantiation
    {
      code: 'const date = new Date();',
      filename: 'Component.tsx'
    },
    {
      code: 'const array = new Array();',
      filename: 'MyComponent.tsx'
    },
    // Non-TypeScript files
    {
      code: 'const service = new MyService();',
      filename: 'script.js'
    }
  ],

  invalid: [
    {
      code: 'const service = new QualiaService();',
      filename: 'MyComponent.tsx',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const syncService = new BackendSyncService();',
      filename: 'GameComponent.ts',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const calculator = new QualiaStateCalculatorService();',
      filename: 'src/components/Game.tsx',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    },
    {
      code: 'const service = new MyModule.GameService();',
      filename: 'Component.tsx',
      errors: [{
        messageId: 'noDirectInstantiation'
      }]
    }
  ]
});
