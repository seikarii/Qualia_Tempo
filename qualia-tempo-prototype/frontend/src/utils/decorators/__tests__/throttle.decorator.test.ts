// QUALIA.CODE v1.2 - Test for @throttle Decorator
// Tests method throttling behavior

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { throttle } from '../throttle.decorator';
import type { ILogger } from '../../../services/interfaces/ILogger';

describe('@throttle Decorator', () => {
  let mockLogger: any;
  
  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
  });

  it('should allow first call immediately', () => {
    class TestClass {
      logger = mockLogger;
      callCount = 0;
      
      @throttle(100)
      incrementCount(): void {
        this.callCount++;
      }
    }

    const instance = new TestClass();
    instance.incrementCount();

    expect(instance.callCount).toBe(1);
  });

  it('should create a decorator function', () => {
    // Test that throttle returns a valid decorator
    const decorator = throttle(100);
    expect(decorator).toBeTypeOf('function');
  });

  it('should preserve method context', () => {
    class TestClass {
      logger = mockLogger;
      value = 42;
      
      @throttle(100)
      getValue(): number {
        return this.value;
      }
    }

    const instance = new TestClass();
    const result = instance.getValue();

    expect(result).toBe(42);
  });

  it('should execute decorated method', () => {
    let executed = false;
    class TestClass {
      logger = mockLogger;
      
      @throttle(100)
      testMethod(): void {
        executed = true;
      }
    }

    const instance = new TestClass();
    instance.testMethod();

    expect(executed).toBe(true);
  });
});
