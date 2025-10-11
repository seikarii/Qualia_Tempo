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
    },
    // Async method with @catchError and @retry (REQUIRED)
    {
      code: `
        class BackendSyncService {
          @logMethod()
          @catchError()
          @retry()
          async syncToBackend(data: any) {
            await this.httpService.post('/api/sync', data);
          }
        }
      `,
      filename: 'src/services/BackendSyncService.ts'
    },
    // Simple getter (no @catchError needed)
    {
      code: `
        class QualiaService {
          @logMethod()
          getCurrentState() {
            return this.state;
          }
        }
      `,
      filename: 'src/services/QualiaService.ts'
    },
    // Getter starting with 'is'
    {
      code: `
        class GameControllerService {
          @logMethod()
          isRunning() {
            return this.running;
          }
        }
      `,
      filename: 'src/services/GameControllerService.ts'
    },
    // Protected method (exempt)
    {
      code: `
        class QualiaService {
          protected calculateInternal() {
            return this.data;
          }
        }
      `,
      filename: 'src/services/QualiaService.ts'
    },
    // Private method with underscore prefix (exempt)
    {
      code: `
        class EventBusService {
          private _emit(event: any) {
            // implementation
          }
        }
      `,
      filename: 'src/services/EventBusService.ts'
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
    },
    // Async method without @catchError (VIOLATION) - Also triggers advisory retry
    {
      code: `
        class BackendSyncService {
          @logMethod()
          async syncData(data: any) {
            await this.httpService.post('/api/sync', data);
          }
        }
      `,
      filename: 'src/services/BackendSyncService.ts',
      errors: [
        { messageId: 'missingCatchError' },
        { messageId: 'advisoryRetry' }
      ]
    },
    // Simple getter with unnecessary @catchError (PERFORMANCE VIOLATION)
    {
      code: `
        class QualiaService {
          @logMethod()
          @catchError()
          getCurrentState() {
            return this.state;
          }
        }
      `,
      filename: 'src/services/QualiaService.ts',
      errors: [
        { messageId: 'unnecessaryCatchError' }
      ]
    },
    // Multiple decorator violations (now includes advisory retry for fetch)
    {
      code: `
        class ComplexService {
          processData() {}
          @logMethod()
          async fetchData() {
            return await fetch('/api/data');
          }
          @logMethod()
          @catchError()
          getConfig() {
            return this.config;
          }
        }
      `,
      filename: 'src/services/ComplexService.ts',
      errors: [
        { messageId: 'missingLogMethod' },
        { messageId: 'missingCatchError' },
        { messageId: 'advisoryRetry' },
        { messageId: 'unnecessaryCatchError' }
      ]
    }
  ]
});

console.log('✅ All enforce-method-decorators tests passed!');

