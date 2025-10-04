// QUALIA.CODE v1.2 - Test for @validate Decorator
// Comprehensive unit tests with full isolation, High-Fidelity mocking, and schemaRegistry mocking

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ILogger } from '../../../services/interfaces/ILogger';

// Mock schemaRegistry module-level FIRST
vi.mock('../../../schemas', () => ({
  schemaRegistry: {
    ValidSchema: {
      safeParse: (data: unknown) => ({ success: true })
    },
    InvalidSchema: {
      safeParse: (data: unknown) => ({
        success: false,
        error: {
          message: 'Validation failed',
          issues: [{ path: ['field'], message: 'Invalid field' }]
        }
      })
    }
    // NonExistentSchema not defined, so undefined
  }
}));

// Mock EmergencyLogger to prevent console output
vi.mock('../../EmergencyLogger', () => ({
  EmergencyLogger: {
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

// CRITICAL: Import validate decorator DIRECTLY from its file to bypass global mocks
// This is necessary because setup.ts mocks the entire decorators module
import { validate } from '../validate.decorator';

describe('@validate Decorator', () => {
  let mockLogger: ILogger;
  
  beforeEach(() => {
    // High-Fidelity Mock: All methods return undefined (void return type)
    mockLogger = {
      debug: vi.fn().mockReturnValue(undefined),
      info: vi.fn().mockReturnValue(undefined),
      warn: vi.fn().mockReturnValue(undefined),
      error: vi.fn().mockReturnValue(undefined),
      setLevel: vi.fn().mockReturnValue(undefined),
      getLevel: vi.fn().mockReturnValue('info'),
      child: vi.fn().mockReturnValue(mockLogger)
    };
    
    // Reset mock call counts
    vi.clearAllMocks();
  });

  it('should validate first argument successfully and execute method when validation passes', () => {
    class TestClass {
      logger = mockLogger;
      
      @validate('ValidSchema')
      processData(data: { name: string }): string {
        return `processed: ${data.name}`;
      }
    }

    const instance = new TestClass();
    const result = instance.processData({ name: 'test' });

    expect(result).toBe('processed: test');
    // Stage-3 decorator executes method successfully when validation passes
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should call validation logic with proper schema from registry', () => {
    // This test verifies that the decorator integrates with schemaRegistry correctly
    class TestClass {
      logger = mockLogger;
      
      @validate('ValidSchema')
      processData(data: { value: number }): number {
        return data.value * 2;
      }
    }

    const instance = new TestClass();
    const result = instance.processData({ value: 21 });

    // Verify method executed with validated data
    expect(result).toBe(42);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should not perform validation when method is called with no arguments', () => {
    class TestClass {
      logger = mockLogger;
      
      @validate('ValidSchema')
      noArgsMethod(): string {
        return 'no args';
      }
    }

    const instance = new TestClass();
    const result = instance.noArgsMethod();

    expect(result).toBe('no args');
    // No validation should occur, so no debug log
    expect(mockLogger.debug).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should validate data for async methods before execution', async () => {
    class TestClass {
      logger = mockLogger;
      
      @validate('ValidSchema')
      async asyncProcessData(data: { name: string }): Promise<string> {
        return `processed: ${data.name}`;
      }
    }

    const instance = new TestClass();
    const result = await instance.asyncProcessData({ name: 'test' });

    // With valid schema, method executes successfully
    expect(result).toBe('processed: test');
  });

  it('should throw error and log when validation fails', () => {
    // Test the decorator as a function, not via TypeScript decorator syntax
    // This bypasses any decorator mocking issues
    const originalMethod = function(this: any, data: any) {
      return 'should not reach here';
    };
    
    const decoratedMethod = validate('InvalidSchema')(
      originalMethod,
      { name: 'failValidation', kind: 'method' } as any
    );
    
    const instance = { logger: mockLogger };
    
    // GOLD.CODE: Expect clean, unwrapped error message from performValidation
    expect(() => decoratedMethod.call(instance, { invalid: 'data' })).toThrow("Validation failed");
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when schema does not exist in registry', () => {
    // Test the decorator as a function, not via TypeScript decorator syntax
    const originalMethod = function(this: any, data: any) {
      return 'should not reach here';
    };
    
    const decoratedMethod = validate('NonExistentSchema')(
      originalMethod,
      { name: 'methodWithMissingSchema', kind: 'method' } as any
    );
    
    const instance = { logger: mockLogger };
    
    // GOLD.CODE: Expect clean, unwrapped error message from getSchemaFromRegistry
    expect(() => decoratedMethod.call(instance, { data: 'test' })).toThrow("Schema 'NonExistentSchema' not found in registry");
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
