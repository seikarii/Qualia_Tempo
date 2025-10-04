// QUALIA.CODE v1.2 - Test for @catchError Decorator
// Comprehensive unit tests with full isolation and High-Fidelity mocking

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { catchError } from '../catch-error.decorator';
import type { ILogger } from '../../../services/interfaces/ILogger';

describe('@catchError Decorator', () => {
  let mockLogger: ILogger;
  
  beforeEach(() => {
    // High-Fidelity Mock: All methods return undefined (void return type)
    mockLogger = {
      debug: vi.fn().mockReturnValue(undefined),
      info: vi.fn().mockReturnValue(undefined),
      warn: vi.fn().mockReturnValue(undefined),
      error: vi.fn().mockReturnValue(undefined)
    };
  });

  it('should allow synchronous methods to execute successfully without interference', () => {
    class TestClass {
      logger = mockLogger;
      
      @catchError
      successMethod(arg: string): string {
        return `success: ${arg}`;
      }
    }

    const instance = new TestClass();
    const result = instance.successMethod('test');

    expect(result).toBe('success: test');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should catch synchronous errors, log them with structured data, and re-throw', () => {
    class TestClass {
      logger = mockLogger;
      
      @catchError
      throwingMethod(arg: number): never {
        throw new Error('Sync error test');
      }
    }

    const instance = new TestClass();
    
    expect(() => instance.throwingMethod(42)).toThrow('Sync error test');
    
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'TestClass.throwingMethod:',
      expect.objectContaining({
        error: 'Sync error test',
        stack: expect.any(String),
        arguments: [42],
        timestamp: expect.any(String)
      })
    );
  });

  it('should allow asynchronous methods to resolve successfully without interference', async () => {
    class TestClass {
      logger = mockLogger;
      
      @catchError
      async asyncSuccessMethod(value: number): Promise<number> {
        return value * 2;
      }
    }

    const instance = new TestClass();
    const result = await instance.asyncSuccessMethod(21);

    expect(result).toBe(42);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should catch asynchronous errors, log them with structured data, and re-throw as rejected promise', async () => {
    class TestClass {
      logger = mockLogger;
      
      @catchError
      async asyncThrowingMethod(arg: string): Promise<never> {
        throw new Error('Async error test');
      }
    }

    const instance = new TestClass();
    
    await expect(instance.asyncThrowingMethod('fail')).rejects.toThrow('Async error test');
    
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'TestClass.asyncThrowingMethod:',
      expect.objectContaining({
        error: 'Async error test',
        stack: expect.any(String),
        arguments: ['fail'],
        timestamp: expect.any(String)
      })
    );
  });

  it('should handle errors that are not Error instances and convert them to strings', () => {
    class TestClass {
      logger = mockLogger;
      
      @catchError
      throwingNonErrorMethod(): never {
        // eslint-disable-next-line no-throw-literal
        throw 'plain string error';
      }
    }

    const instance = new TestClass();
    
    expect(() => instance.throwingNonErrorMethod()).toThrow('plain string error');
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      'TestClass.throwingNonErrorMethod:',
      expect.objectContaining({
        error: 'plain string error',
        stack: 'No stack trace'
      })
    );
  });
});
