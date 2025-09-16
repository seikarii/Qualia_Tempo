/**
 * @fileoverview Tests for enforce-method-decorators rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-method-decorators');

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

ruleTester.run('enforce-method-decorators', rule, {
  valid: [
    // Methods with decorators
    {
      code: `
        class QualiaService {
          @logMethod()
          calculateState() {}
        }
      `,
      filename: 'QualiaService.ts'
    },
    {
      code: `
        class BackendSyncService {
          @catchError()
          @throttle(250)
          syncData() {}
        }
      `,
      filename: 'BackendSyncService.ts'
    },
    // Exempt methods
    {
      code: `
        class GameService {
          constructor() {}
          start() {}
          stop() {}
          initialize() {}
        }
      `,
      filename: 'GameService.ts'
    },
    // Private methods
    {
      code: `
        class QualiaService {
          private _internalMethod() {}
          _helperMethod() {}
        }
      `,
      filename: 'QualiaService.ts'
    },
    // Non-service files
    {
      code: `
        class Component {
          handleClick() {}
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class QualiaService {
          calculateState() {}
        }
      `,
      filename: 'QualiaService.ts',
      errors: [{
        messageId: 'missingDecorator'
      }]
    },
    {
      code: `
        class BackendSyncService {
          public syncData() {}
        }
      `,
      filename: 'BackendSyncService.ts',
      errors: [{
        messageId: 'missingDecorator'
      }]
    },
    {
      code: `
        class GameControllerService {
          handleAction() {}
          processEvent() {}
        }
      `,
      filename: 'GameControllerService.ts',
      errors: [
        { messageId: 'missingDecorator' },
        { messageId: 'missingDecorator' }
      ]
    }
  ]
});
