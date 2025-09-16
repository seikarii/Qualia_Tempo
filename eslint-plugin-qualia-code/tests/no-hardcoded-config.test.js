/**
 * @fileoverview Tests for no-hardcoded-config rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-hardcoded-config');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-hardcoded-config', rule, {
  valid: [
    // Allowed in config files
    {
      code: 'const timeout = 5000;',
      filename: 'config.ts'
    },
    {
      code: 'const config = { maxRetries: 3 };',
      filename: 'src/config/game.ts'
    },
    // Allowed small numbers
    {
      code: 'const item = array[0];',
      filename: 'QualiaService.ts'
    },
    {
      code: 'function test() { if (count === 1) return; }',
      filename: 'src/services/GameService.ts'
    },
    // Allowed in non-service contexts
    {
      code: 'const timeout = 5000;',
      filename: 'Component.tsx'
    },
    // Configuration context
    {
      code: 'const gameConfig = { speed: 100, difficulty: 5 };',
      filename: 'MyService.ts'
    }
  ],

  invalid: [
    {
      code: 'const timeout = 5000;',
      filename: 'QualiaService.ts',
      errors: [{
        messageId: 'noHardcodedConfig'
      }]
    },
    {
      code: 'const maxRetries = 25;',
      filename: 'src/services/BackendSyncService.ts',
      errors: [{
        messageId: 'noHardcodedConfig'
      }]
    },
    {
      code: 'const apiUrl = "https://api.example.com";',
      filename: 'services/ApiService.ts',
      errors: [{
        messageId: 'noHardcodedConfig'
      }]
    }
  ]
});
