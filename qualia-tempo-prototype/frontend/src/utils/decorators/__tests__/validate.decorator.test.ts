// QUALIA.CODE v1.2 - Test for @validate Decorator
// Comprehensive unit tests with full isolation, High-Fidelity mocking, and schemaRegistry mocking

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ILogger } from '../../../services/interfaces/ILogger';

// Mock schemaRegistry module-level
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

// Import after mocking
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
    let executed = false;
    class TestClass {
      logger = mockLogger;
      
      @validate('InvalidSchema')
      failValidation(data: any) {
        executed = true;
        return 'should not reach here';
      }
    }

    const instance = new TestClass();
    expect(() => instance.failValidation({ invalid: 'data' })).toThrow("Schema validation failed: Validation failed");
    expect(executed).toBe(false);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when schema does not exist in registry', () => {
    class TestClass {
      logger = mockLogger;
      
      @validate('NonExistentSchema')
      methodWithMissingSchema(data: any) {
        return 'should not reach here';
      }
    }

    const instance = new TestClass();
    expect(() => instance.methodWithMissingSchema({ data: 'test' })).toThrow("Schema validation failed: Schema 'NonExistentSchema' not found in registry");
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

// Mock schemaRegistry module-level
vi.mock('../../../schemas', () => ({
  schemaRegistry: {
    ValidSchema: {
      safeParse: vi.fn().mockReturnValue({ success: true })
    },
    InvalidSchema: {
      safeParse: vi.fn().mockReturnValue({
        success: false,
        error: {
          message: 'Validation failed',
          issues: [{ path: ['field'], message: 'Invalid field' }]
        }
      })
    }
    // NonExistentSchema not defined, so accessing it returns undefined
  }
}));

// Import after mocking
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
    let executed = false;
    class TestClass {
      logger = mockLogger;
      
      @validate('InvalidSchema')
      failValidation(data: any) {
        executed = true;
        return 'should not reach here';
      }
    }

    const instance = new TestClass();
    expect(() => instance.failValidation({ invalid: 'data' })).toThrow("Schema validation failed: Validation failed");
    expect(executed).toBe(false);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when schema does not exist in registry', () => {
    class TestClass {
      logger = mockLogger;
      
      @validate('NonExistentSchema')
      methodWithMissingSchema(data: any) {
        return 'should not reach here';
      }
    }

    const instance = new TestClass();
    expect(() => instance.methodWithMissingSchema({ data: 'test' })).toThrow("Schema validation failed: Schema 'NonExistentSchema' not found in registry");
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
