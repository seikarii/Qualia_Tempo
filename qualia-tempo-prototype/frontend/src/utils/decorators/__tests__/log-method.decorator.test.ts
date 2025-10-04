// QUALIA.CODE v1.2 - Test for @logMethod Decorator
// Comprehensive unit tests with full isolation

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logMethod } from '../log-method.decorator';
import type { ILogger } from '../../../services/interfaces/ILogger';

describe('@logMethod Decorator', () => {
  let mockLogger: ILogger;
  
  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
  });

  it('should log method entry and exit for synchronous methods', () => {
    class TestClass {
      logger = mockLogger;
      
      @logMethod
      testMethod(arg: string): string {
        return `processed: ${arg}`;
      }
    }

    const instance = new TestClass();
    const result = instance.testMethod('test');

    expect(result).toBe('processed: test');
    expect(mockLogger.debug).toHaveBeenCalledTimes(2); // entry + exit
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('→ ENTER TestClass.testMethod'),
      expect.objectContaining({ arguments: ['test'] })
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('← EXIT TestClass.testMethod'),
      expect.objectContaining({ result: 'processed: test' })
    );
  });

  it('should log method entry and exit for async methods', async () => {
    class TestClass {
      logger = mockLogger;
      
      @logMethod
      async asyncMethod(arg: number): Promise<number> {
        return arg * 2;
      }
    }

    const instance = new TestClass();
    const result = await instance.asyncMethod(5);

    expect(result).toBe(10);
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
  });

  it('should log errors when method throws', () => {
    class TestClass {
      logger = mockLogger;
      
      @logMethod
      throwingMethod(): void {
        throw new Error('Test error');
      }
    }

    const instance = new TestClass();
    
    expect(() => instance.throwingMethod()).toThrow('Test error');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('✗ ERROR TestClass.throwingMethod'),
      expect.objectContaining({ error: 'Test error' })
    );
  });

  it('should handle methods with no arguments', () => {
    class TestClass {
      logger = mockLogger;
      
      @logMethod
      noArgsMethod(): string {
        return 'no args';
      }
    }

    const instance = new TestClass();
    instance.noArgsMethod();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('→ ENTER'),
      expect.objectContaining({ arguments: 'no arguments' })
    );
  });
});
