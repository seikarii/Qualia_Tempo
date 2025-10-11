/**
 * @fileoverview Tests for enforce-high-fidelity-mocks rule
 * @author Qualia Tempo - CRISALIDA Architecture Team
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-high-fidelity-mocks');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  }
});

ruleTester.run('enforce-high-fidelity-mocks', rule, {
  valid: [
    // ✅ High-fidelity mock with mockReturnValue for sync method
    {
      code: `
        interface IDataService {
          getName(): string;
        }
        export const mockDataService: IDataService = {
          getName: vi.fn().mockReturnValue('')
        };
      `,
      filename: 'src/testing/mocks/data-service.mock.ts'
    },
    
    // ✅ High-fidelity mock with mockResolvedValue for async method
    {
      code: `
        interface IApiService {
          fetchData(): Promise<string>;
        }
        export const mockApiService: IApiService = {
          fetchData: vi.fn().mockResolvedValue('')
        };
      `,
      filename: 'src/testing/mocks/api-service.mock.ts'
    },
    
    // ✅ Void methods can use bare vi.fn()
    {
      code: `
        interface ILogger {
          log(message: string): void;
        }
        export const mockLogger: ILogger = {
          log: vi.fn()
        };
      `,
      filename: 'src/testing/mocks/logger.mock.ts'
    },
    
    // ✅ Complex return types with proper defaults
    {
      code: `
        interface IConfigService {
          getConfig(): { apiUrl: string; timeout: number; };
        }
        export const mockConfigService: IConfigService = {
          getConfig: vi.fn().mockReturnValue({ apiUrl: '', timeout: 0 })
        };
      `,
      filename: 'src/testing/mocks/config-service.mock.ts'
    },
    
    // ✅ Not in mocks directory - rule doesn't apply
    {
      code: `
        const mockService = {
          getData: vi.fn() // This is fine outside mocks/
        };
      `,
      filename: 'src/components/MyComponent.test.ts'
    }
  ],

  invalid: [
    // ❌ Bare vi.fn() for string return type
    {
      code: `
        interface IDataService {
          getName(): string;
        }
        export const mockDataService: IDataService = {
          getName: vi.fn()
        };
      `,
      filename: 'src/testing/mocks/data-service.mock.ts',
      errors: [{
        messageId: 'lowFidelityMock',
        data: {
          methodName: 'getName',
          returnType: 'string',
          suggestion: "''"
        }
      }]
    },
    
    // ❌ Bare vi.fn() for Promise return type
    {
      code: `
        interface IApiService {
          fetchData(): Promise<number>;
        }
        export const mockApiService: IApiService = {
          fetchData: vi.fn()
        };
      `,
      filename: 'src/testing/mocks/api-service.mock.ts',
      errors: [{
        messageId: 'lowFidelityMock',
        data: {
          methodName: 'fetchData',
          returnType: 'Promise<number>',
          suggestion: '0'
        }
      }]
    },
    
    // ❌ Using mockReturnValue for async method (should be mockResolvedValue)
    {
      code: `
        interface IAsyncService {
          fetchData(): Promise<string>;
        }
        export const mockAsyncService: IAsyncService = {
          fetchData: vi.fn().mockReturnValue('data')
        };
      `,
      filename: 'src/testing/mocks/async-service.mock.ts',
      errors: [{
        messageId: 'asyncMismatch',
        data: {
          methodName: 'fetchData',
          promiseType: 'string',
          suggestion: "''"
        }
      }]
    },
    
    // ❌ Using mockResolvedValue for sync method (over-complication)
    {
      code: `
        interface IDataService {
          getCount(): number;
        }
        export const mockDataService: IDataService = {
          getCount: vi.fn().mockResolvedValue(0)
        };
      `,
      filename: 'src/testing/mocks/data-service.mock.ts',
      errors: [{
        messageId: 'syncMismatch',
        data: {
          methodName: 'getCount',
          returnType: 'number',
          suggestion: '0'
        }
      }]
    }
  ]
});

console.log('✅ All enforce-high-fidelity-mocks tests passed!');
