// QUALIA.CODE v1.2 - Test for @measureTime Decorator
// Comprehensive unit tests with full isolation, High-Fidelity mocking, and performance.now() mocking

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { measureTime } from '../measure-time.decorator';
import type { ILogger } from '../../../services/interfaces/ILogger';

describe('@measureTime Decorator', () => {
  let mockLogger: ILogger;
  let performanceNowSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    // High-Fidelity Mock: All methods return undefined (void return type)
    mockLogger = {
      debug: vi.fn().mockReturnValue(undefined),
      info: vi.fn().mockReturnValue(undefined),
      warn: vi.fn().mockReturnValue(undefined),
      error: vi.fn().mockReturnValue(undefined)
    };
    
    // Mock performance.now() for precise time control
    performanceNowSpy = vi.spyOn(performance, 'now');
  });
  
  afterEach(() => {
    performanceNowSpy.mockRestore();
  });

  it('should measure and log execution time for FAST synchronous methods (<1ms)', () => {
    performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(100.5); // 0.5ms duration
    
    class TestClass {
      logger = mockLogger;
      
      @measureTime
      fastMethod(): string {
        return 'fast';
      }
    }

    const instance = new TestClass();
    const result = instance.fastMethod();

    expect(result).toBe('fast');
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringMatching(/FAST TestClass\.fastMethod: 0\.50ms/)
    );
  });

  it('should measure and log execution time for GOOD synchronous methods (1-10ms)', () => {
    performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(105); // 5ms duration
    
    class TestClass {
      logger = mockLogger;
      
      @measureTime
      goodMethod(): string {
        return 'good';
      }
    }

    const instance = new TestClass();
    instance.goodMethod();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('⚡ GOOD TestClass.goodMethod: 5.00ms')
    );
  });

  it('should measure and log execution time for OK synchronous methods (10-100ms) with warn level', () => {
    performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(150); // 50ms duration
    
    class TestClass {
      logger = mockLogger;
      
      @measureTime
      okMethod(): string {
        return 'ok';
      }
    }

    const instance = new TestClass();
    instance.okMethod();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('⏱️ OK TestClass.okMethod: 50.00ms')
    );
  });

  it('should measure and log execution time for SLOW synchronous methods (100-1000ms) with warn level', () => {
    performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(600); // 500ms duration
    
    class TestClass {
      logger = mockLogger;
      
      @measureTime
      slowMethod(): string {
        return 'slow';
      }
    }

    const instance = new TestClass();
    instance.slowMethod();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('🐌 SLOW TestClass.slowMethod: 500.00ms')
    );
  });

  it('should measure and log execution time for VERY SLOW synchronous methods (>1000ms) with error level', () => {
    performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(2100); // 2000ms duration
    
    class TestClass {
      logger = mockLogger;
      
      @measureTime
      verySlowMethod(): string {
        return 'very slow';
      }
    }

    const instance = new TestClass();
    instance.verySlowMethod();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('🚨 VERY SLOW TestClass.verySlowMethod: 2000.00ms')
    );
  });

  it('should measure and log execution time for asynchronous methods', async () => {
    let callCount = 0;
    performanceNowSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 100; // start
      return 103; // end - 3ms duration
    });
    
    class TestClass {
      logger = mockLogger;
      
      @measureTime
      async asyncMethod(value: number): Promise<number> {
        return value * 2;
      }
    }

    const instance = new TestClass();
    const result = await instance.asyncMethod(21);

    expect(result).toBe(42);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('⚡ GOOD TestClass.asyncMethod: 3.00ms')
    );
  });

  it('should measure execution time even when method throws an error and mark it with error indicator', () => {
    performanceNowSpy.mockReturnValueOnce(100).mockReturnValueOnce(110); // 10ms duration
    
    class TestClass {
      logger = mockLogger;
      
      @measureTime
      throwingMethod(): never {
        throw new Error('Test error');
      }
    }

    const instance = new TestClass();
    
    expect(() => instance.throwingMethod()).toThrow('Test error');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/OK TestClass\.throwingMethod: 10\.00ms ✗/)
    );
  });
});
