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
    // Generated file with proper marker
    {
      code: '// @generated DO NOT EDIT\nexport interface QualiaState {}',
      filename: 'types/contracts.ts'
    },
    {
      code: '// @generated DO NOT EDIT\nclass QualiaState {}',
      filename: 'api/models.py'
    },
    // Non-contract files
    {
      code: 'export interface MyInterface {}',
      filename: 'types/custom.ts'
    },
    {
      code: 'class MyClass {}',
      filename: 'services/MyService.py'
    }
  ],

  invalid: [
    {
      code: 'export interface QualiaState {}',
      filename: 'src/types/contracts.ts',
      errors: [{
        messageId: 'noManualEdit'
      }]
    },
    {
      code: 'class QualiaState {}',
      filename: 'api/models.py',
      errors: [{
        messageId: 'noManualEdit'
      }]
    },
    {
      code: 'export interface CombatData {}',
      filename: 'frontend/src/types/contracts.ts',
      errors: [{
        messageId: 'noManualEdit'
      }]
    }
  ]
});
