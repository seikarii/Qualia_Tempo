/**
 * @fileoverview Tests for no-manual-contract-edit rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-manual-contract-edit');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-manual-contract-edit', rule, {
  valid: [
    // Non-contract files (no warnings)
    {
      code: 'export interface MyInterface {}',
      filename: 'types/custom.ts'
    },
    {
      code: 'class MyClass {}',
      filename: 'services/MyService.py'
    },
    // Contract files WITHOUT generation marker (allowed - user-written contracts)
    {
      code: 'export interface ServiceConfig {}',
      filename: 'services/contracts/IMyService.contracts.ts'
    },
    // Non-contract file that happens to be in /types/
    {
      code: 'export interface CustomType {}',
      filename: 'types/custom.d.ts'
    }
  ],

  invalid: [
    // Generated file WITH marker (triggers warning - don't edit)
    {
      code: '// @generated DO NOT EDIT\nexport interface QualiaState {}',
      filename: 'src/types/contracts.ts',
      errors: [{
        messageId: 'noManualEdit'
      }]
    },
    // TypeScript contracts WITH generation marker
    {
      code: '// automatically generated from JSON schema\nexport interface CombatData {}',
      filename: 'frontend/src/types/contracts.ts',
      errors: [{
        messageId: 'noManualEdit'
      }]
    }
  ]
});
