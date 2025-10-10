const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-error-boundary-on-async');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('enforce-error-boundary-on-async', rule, {
  valid: [
    // ✅ Async method with @catchError
    {
      code: `
        class ApiService {
          @catchError()
          public async fetchData(): Promise<Data> {
            return await this.http.get('/data');
          }
        }
      `,
      filename: 'ApiService.ts'
    },
    
    // ✅ Async method with exemption comment
    {
      code: `
        class OptimizedService {
          // @catchError-exempt: Hot path getter, errors handled upstream
          public async getCurrentState(): Promise<State> {
            return this.state;
          }
        }
      `,
      filename: 'OptimizedService.ts'
    },
    
    // ✅ Synchronous method (no @catchError needed)
    {
      code: `
        class SyncService {
          public getData(): Data {
            return this.data;
          }
        }
      `,
      filename: 'SyncService.ts'
    },
    
    // ✅ Test file async method (exempt from rule)
    {
      code: `
        describe('MyService', () => {
          it('should work', async () => {
            await service.doSomething();
          });
        });
      `,
      filename: 'MyService.test.ts'
    },
    
    // ✅ Multiple decorators with @catchError present
    {
      code: `
        class MultiDecoratorService {
          @logMethod()
          @catchError()
          @measureTime()
          public async complexOperation(): Promise<void> {
            await this.process();
          }
        }
      `,
      filename: 'MultiDecoratorService.ts'
    }
  ],

  invalid: [
    // ❌ Async method without @catchError
    {
      code: `
        class BadAsyncService {
          public async loadData(): Promise<void> {
            await this.fetch();
          }
        }
      `,
      filename: 'BadAsyncService.ts',
      errors: [{
        messageId: 'missingCatchError',
        data: { methodType: 'method', methodName: 'loadData' }
      }]
    },
    
    // ❌ Async method with other decorators but no @catchError
    {
      code: `
        class PartiallyDecoratedService {
          @logMethod()
          public async saveData(data: any): Promise<void> {
            await this.db.save(data);
          }
        }
      `,
      filename: 'PartiallyDecoratedService.ts',
      errors: [{
        messageId: 'missingCatchError',
        data: { methodType: 'method', methodName: 'saveData' }
      }]
    },
    
    // ❌ Private async method without @catchError
    {
      code: `
        class PrivateAsyncService {
          private async _internalFetch(): Promise<void> {
            await this.http.get('/internal');
          }
        }
      `,
      filename: 'PrivateAsyncService.ts',
      errors: [{
        messageId: 'missingCatchError',
        data: { methodType: 'method', methodName: '_internalFetch' }
      }]
    },
    
    // ❌ Multiple async methods without @catchError
    {
      code: `
        class MultiAsyncService {
          public async method1(): Promise<void> {}
          public async method2(): Promise<void> {}
        }
      `,
      filename: 'MultiAsyncService.ts',
      errors: [
        { messageId: 'missingCatchError', data: { methodType: 'method', methodName: 'method1' } },
        { messageId: 'missingCatchError', data: { methodType: 'method', methodName: 'method2' } }
      ]
    }
  ]
});

console.log('✅ All enforce-error-boundary-on-async tests passed!');
