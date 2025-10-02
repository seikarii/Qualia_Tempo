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
      filename: 'src/services/QualiaService.ts'
    },
    {
      code: `
        class BackendSyncService {
          @logMethod()
          @catchError()
          @throttle(250)
          syncData() {}
        }
      `,
      filename: 'src/services/BackendSyncService.ts'
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
      filename: 'src/services/GameService.ts'
    },
    // Private methods
    {
      code: `
        class QualiaService {
          private _internalMethod() {}
          _helperMethod() {}
        }
      `,
      filename: 'src/services/QualiaService.ts'
    },
    // Non-service files
    {
      code: `
        class Component {
          handleClick() {}
        }
      `,
      filename: 'Component.tsx'
    },
    // TypeScript overload declarations (should be allowed)
    {
      code: `
        class QualiaService {
          calculateState(params: any): void;
          calculateState(params: any, options?: any): Promise<void>;
          @logMethod()
          calculateState(params: any, options?: any): void | Promise<void> {
            // implementation
          }
        }
      `,
      filename: 'src/services/QualiaService.ts'
    },
    // Mixed overloads and regular methods
    {
      code: `
        class BackendSyncService {
          syncData(data: any): void;
          syncData(data: any, callback?: Function): Promise<void>;
          @logMethod()
          syncData(data: any, callback?: Function): void | Promise<void> {
            // implementation
          }
          
          @logMethod()
          processBatch() {}
        }
      `,
      filename: 'src/services/BackendSyncService.ts'
    }
  ],

  invalid: [
    {
      code: `
        class QualiaService {
          calculateState() {}
        }
      `,
      filename: 'src/services/QualiaService.ts',
      errors: [{
        messageId: 'missingLogMethod'
      }]
    },
    {
      code: `
        class BackendSyncService {
          public syncData() {}
        }
      `,
      filename: 'src/services/BackendSyncService.ts',
      errors: [{
        messageId: 'missingLogMethod'
      }]
    },
    {
      code: `
        class GameControllerService {
          handleAction() {}
          processEvent() {}
        }
      `,
      filename: 'src/services/GameControllerService.ts',
      errors: [
        { messageId: 'missingLogMethod' },
        { messageId: 'missingLogMethod' }
      ]
    }
  ]
});
