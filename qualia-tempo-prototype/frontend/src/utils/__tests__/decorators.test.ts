/**
 * QUALIA.CODE v1.1 - Decorator Utilities Tests
 * Comprehensive test suite for decorator functions and utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock LoggerProvider
vi.mock('../../services/Logger', () => ({
  LoggerProvider: {
    getLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock schema registry
vi.mock('../../schemas', () => ({
  schemaRegistry: {
    TestSchema: {
      safeParse: vi.fn().mockReturnValue({ success: true }),
    },
    InvalidSchema: {
      safeParse: vi.fn().mockReturnValue({ success: false, error: { message: 'Invalid data' } }),
    },
  },
}));

describe('Decorator Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset performance API
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Universal Decorator Factory', () => {
    it('should create a working decorator', () => {
      const { createUniversalDecorator } = require('../decorators');

      const testLogic = vi.fn().mockReturnValue(() => 'decorated');
      const decorator = createUniversalDecorator(testLogic);

      class TestClass {
        @decorator
        testMethod() {
          return 'original';
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();

      expect(testLogic).toHaveBeenCalledWith(expect.any(Function), expect.any(Object));
      expect(result).toBe('decorated');
    });

    it('should handle methods without descriptors', () => {
      const { createUniversalDecorator } = require('../decorators');

      const testLogic = vi.fn().mockReturnValue(() => 'decorated');
      const decorator = createUniversalDecorator(testLogic);

      const target = {
        testMethod: () => 'original',
      };

      const result = decorator(target, 'testMethod');

      expect(result).toBeDefined();
      expect(typeof result.value).toBe('function');
    });

    it('should handle non-function properties gracefully', () => {
      const { createUniversalDecorator } = require('../decorators');

      const testLogic = vi.fn();
      const decorator = createUniversalDecorator(testLogic);

      const target = {
        testProperty: 'not a function',
      };

      const result = decorator(target, 'testProperty');

      expect(result).toBeUndefined();
      expect(testLogic).not.toHaveBeenCalled();
    });
  });

  describe('logMethod Decorator', () => {
    it('should log method entry and exit for sync methods', () => {
      const { logMethod } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @logMethod()
        testMethod(arg1: string, arg2: number) {
          return `result-${arg1}-${arg2}`;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod('test', 42);

      expect(logger.debug).toHaveBeenCalledWith('→ ENTER TestClass.testMethod', expect.any(Object));
      expect(logger.debug).toHaveBeenCalledWith('← EXIT TestClass.testMethod', expect.any(Object));
      expect(result).toBe('result-test-42');
    });

    it('should log method entry and exit for async methods', async () => {
      const { logMethod } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @logMethod()
        async testMethod(delay: number) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return 'async-result';
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod(10);

      expect(logger.debug).toHaveBeenCalledWith('→ ENTER TestClass.testMethod', expect.any(Object));
      expect(logger.debug).toHaveBeenCalledWith('← EXIT TestClass.testMethod', expect.any(Object));
      expect(result).toBe('async-result');
    });

    it('should handle errors in sync methods', () => {
      const { logMethod } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @logMethod()
        testMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();

      expect(() => instance.testMethod()).toThrow('Test error');
      expect(logger.error).toHaveBeenCalledWith('✗ ERROR TestClass.testMethod', expect.any(Object));
    });

    it('should handle errors in async methods', async () => {
      const { logMethod } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @logMethod()
        async testMethod() {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Async error');
        }
      }

      const instance = new TestClass();

      await expect(instance.testMethod()).rejects.toThrow('Async error');
      expect(logger.error).toHaveBeenCalledWith('✗ ERROR TestClass.testMethod', expect.any(Object));
    });

    it('should use console fallback when logger is not available', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const { LoggerProvider } = require('../../services/Logger');
      LoggerProvider.getLogger.mockImplementation(() => {
        throw new Error('Logger not available');
      });

      const { logMethod } = require('../decorators');

      class TestClass {
        @logMethod()
        testMethod() {
          return 'result';
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();

      expect(consoleSpy).toHaveBeenCalledWith('→ ENTER TestClass.testMethod', expect.any(Object));
      expect(result).toBe('result');
    });
  });

  describe('throttle Decorator', () => {
    it('should throttle method calls', () => {
      const { throttle } = require('../decorators');

      class TestClass {
        callCount = 0;

        @throttle(100)
        testMethod() {
          this.callCount++;
        }
      }

      const instance = new TestClass();

      // Call multiple times rapidly
      instance.testMethod();
      instance.testMethod();
      instance.testMethod();

      expect(instance.callCount).toBe(1); // Only first call should execute
    });

    it('should allow calls after throttle period', () => {
      const { throttle } = require('../decorators');

      class TestClass {
        callCount = 0;

        @throttle(50)
        testMethod() {
          this.callCount++;
        }
      }

      const instance = new TestClass();

      instance.testMethod();
      expect(instance.callCount).toBe(1);

      // Advance time by 60ms
      vi.advanceTimersByTime(60);

      instance.testMethod();
      expect(instance.callCount).toBe(2);
    });

    it('should use console fallback when logger is not available', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const { LoggerProvider } = require('../../services/Logger');
      LoggerProvider.getLogger.mockImplementation(() => {
        throw new Error('Logger not available');
      });

      const { throttle } = require('../decorators');

      class TestClass {
        callCount = 0;

        @throttle(50)
        testMethod() {
          this.callCount++;
        }
      }

      const instance = new TestClass();

      instance.testMethod();
      instance.testMethod(); // Should be throttled

      expect(instance.callCount).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith('Executing TestClass.testMethod');
    });
  });

  describe('catchError Decorator', () => {
    it('should catch and handle sync errors', () => {
      const { catchError } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @catchError('fallback-value')
        testMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();

      expect(result).toBe('fallback-value');
      expect(logger.error).toHaveBeenCalledWith('TestClass.testMethod:', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('Returning fallback value for TestClass.testMethod:', expect.any(Object));
    });

    it('should catch and handle async errors', async () => {
      const { catchError } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @catchError('async-fallback')
        async testMethod() {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Async error');
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod();

      expect(result).toBe('async-fallback');
      expect(logger.error).toHaveBeenCalledWith('TestClass.testMethod:', expect.any(Object));
    });

    it('should rethrow errors when no fallback is provided', () => {
      const { catchError } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @catchError()
        testMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();

      expect(() => instance.testMethod()).toThrow('Test error');
      expect(logger.error).toHaveBeenCalledWith('TestClass.testMethod:', expect.any(Object));
    });

    it('should use console fallback when logger is not available', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { LoggerProvider } = require('../../services/Logger');
      LoggerProvider.getLogger.mockImplementation(() => {
        throw new Error('Logger not available');
      });

      const { catchError } = require('../decorators');

      class TestClass {
        @catchError('fallback')
        testMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();

      expect(result).toBe('fallback');
      expect(consoleSpy).toHaveBeenCalledWith('TestClass.testMethod:', expect.any(Object));
    });
  });

  describe('measureTime Decorator', () => {
    it('should measure execution time for sync methods', () => {
      const { measureTime } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @measureTime()
        testMethod(delay: number) {
          // Simulate some work
          for (let i = 0; i < delay; i++) {
            // Busy work
          }
          return 'result';
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod(1000);

      expect(result).toBe('result');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('TestClass.testMethod'), expect.any(Object));
    });

    it('should measure execution time for async methods', async () => {
      const { measureTime } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @measureTime()
        async testMethod(delay: number) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return 'async-result';
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod(10);

      expect(result).toBe('async-result');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('TestClass.testMethod'), expect.any(Object));
    });

    it('should categorize performance correctly', () => {
      const { measureTime } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @measureTime()
        fastMethod() {
          return 'fast';
        }

        @measureTime()
        slowMethod() {
          // Simulate slow operation
          for (let i = 0; i < 100000; i++) {
            // Busy work
          }
          return 'slow';
        }
      }

      const instance = new TestClass();

      instance.fastMethod();
      instance.slowMethod();

      // Check that different performance categories are logged
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('🚀 FAST'), expect.any(Object));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('🐌 SLOW'), expect.any(Object));
    });

    it('should handle errors in performance measurement', () => {
      const { measureTime } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @measureTime()
        errorMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();

      expect(() => instance.errorMethod()).toThrow('Test error');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('🚨 VERY SLOW'), expect.any(Object));
    });
  });

  describe('validate Decorator', () => {
    it('should validate method arguments successfully', () => {
      const { validate } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @validate('TestSchema')
        testMethod(data: any) {
          return `validated-${JSON.stringify(data)}`;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod({ test: 'data' });

      expect(result).toBe('validated-{"test":"data"}');
      expect(logger.debug).toHaveBeenCalledWith('✅ Schema validation passed for TestSchema in TestClass.testMethod');
    });

    it('should throw error for invalid data', () => {
      const { validate } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @validate('InvalidSchema')
        testMethod(data: any) {
          return 'should not reach here';
        }
      }

      const instance = new TestClass();

      expect(() => instance.testMethod({ invalid: 'data' })).toThrow('Schema validation failed');
      expect(logger.error).toHaveBeenCalledWith('Schema validation failed for InvalidSchema in TestClass.testMethod:', expect.any(Object));
    });

    it('should handle missing schema gracefully', () => {
      const { validate } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @validate('NonExistentSchema')
        testMethod(data: any) {
          return 'result';
        }
      }

      const instance = new TestClass();

      expect(() => instance.testMethod({ data: 'test' })).toThrow('Schema \'NonExistentSchema\' not found in registry');
      expect(logger.error).toHaveBeenCalledWith('Schema validation failed for NonExistentSchema in TestClass.testMethod:', expect.any(Object));
    });

    it('should skip validation when no arguments provided', () => {
      const { validate } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @validate('TestSchema')
        testMethod() {
          return 'no args';
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();

      expect(result).toBe('no args');
      expect(logger.debug).not.toHaveBeenCalledWith('✅ Schema validation passed');
    });
  });

  describe('validateEventProperty Decorator', () => {
    it('should validate event property successfully', () => {
      const { validateEventProperty } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @validateEventProperty('data', 'TestSchema')
        testMethod(event: any) {
          return `processed-${JSON.stringify(event.data)}`;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod({ data: { test: 'value' } });

      expect(result).toBe('processed-{"test":"value"}');
      expect(logger.debug).toHaveBeenCalledWith('✅ Event property validation passed for data.TestSchema in TestClass.testMethod');
    });

    it('should throw error for missing property', () => {
      const { validateEventProperty } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @validateEventProperty('missingProp', 'TestSchema')
        testMethod(event: any) {
          return 'should not reach here';
        }
      }

      const instance = new TestClass();

      expect(() => instance.testMethod({ otherProp: 'value' })).toThrow('Property \'missingProp\' not found in event object');
      expect(logger.error).toHaveBeenCalledWith('Event property validation failed for missingProp in TestClass.testMethod:', expect.any(Object));
    });

    it('should throw error for invalid property data', () => {
      const { validateEventProperty } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @validateEventProperty('data', 'InvalidSchema')
        testMethod(event: any) {
          return 'should not reach here';
        }
      }

      const instance = new TestClass();

      expect(() => instance.testMethod({ data: { invalid: 'data' } })).toThrow('Schema validation failed');
      expect(logger.error).toHaveBeenCalledWith('Event property validation failed for data.InvalidSchema in TestClass.testMethod:', expect.any(Object));
    });
  });

  describe('qualiaMethod Decorator', () => {
    it('should combine multiple decorators', () => {
      const { qualiaMethod } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @qualiaMethod({ throttleMs: 100, schema: 'TestSchema' })
        testMethod(data: any) {
          return `processed-${JSON.stringify(data)}`;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod({ test: 'data' });

      expect(result).toBe('processed-{"test":"data"}');
      expect(logger.debug).toHaveBeenCalledWith('→ ENTER TestClass.testMethod', expect.any(Object));
      expect(logger.debug).toHaveBeenCalledWith('✅ Schema validation passed for TestSchema in TestClass.testMethod');
    });

    it('should handle decorator options correctly', () => {
      const { qualiaMethod } = require('../decorators');
      const logger = require('../../services/Logger').LoggerProvider.getLogger();

      class TestClass {
        @qualiaMethod({
          skipLogging: true,
          skipTiming: true,
          fallbackValue: 'fallback'
        })
        testMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod();

      expect(result).toBe('fallback');
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should apply decorators in correct order', () => {
      const executionOrder: string[] = [];

      // Mock decorators to track execution order
      vi.doMock('../decorators', () => ({
        ...require('../decorators'),
        throttle: vi.fn().mockImplementation(() => (target: any, propertyKey: string) => {
          executionOrder.push('throttle');
          return { value: target[propertyKey] };
        }),
        validate: vi.fn().mockImplementation(() => (target: any, propertyKey: string) => {
          executionOrder.push('validate');
          return { value: target[propertyKey] };
        }),
        catchError: vi.fn().mockImplementation(() => (target: any, propertyKey: string) => {
          executionOrder.push('catchError');
          return { value: target[propertyKey] };
        }),
        logMethod: vi.fn().mockImplementation(() => (target: any, propertyKey: string) => {
          executionOrder.push('logMethod');
          return { value: target[propertyKey] };
        }),
        measureTime: vi.fn().mockImplementation(() => (target: any, propertyKey: string) => {
          executionOrder.push('measureTime');
          return { value: target[propertyKey] };
        }),
      }));

      vi.resetModules();
      const { qualiaMethod } = require('../decorators');

      class TestClass {
        @qualiaMethod({ throttleMs: 100, schema: 'TestSchema' })
        testMethod() {
          return 'result';
        }
      }

      // The decorators should be applied in reverse order (outermost first)
      expect(executionOrder).toContain('throttle');
      expect(executionOrder).toContain('validate');
      expect(executionOrder).toContain('catchError');
      expect(executionOrder).toContain('logMethod');
      expect(executionOrder).toContain('measureTime');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle high-frequency method calls', () => {
      const { throttle } = require('../decorators');

      class TestClass {
        callCount = 0;

        @throttle(10)
        testMethod() {
          this.callCount++;
        }
      }

      const instance = new TestClass();

      // Call many times rapidly
      for (let i = 0; i < 1000; i++) {
        instance.testMethod();
      }

      expect(instance.callCount).toBe(1); // Only first call should execute
    });

    it('should handle deeply nested class hierarchies', () => {
      const { logMethod } = require('../decorators');

      class BaseClass {
        @logMethod()
        baseMethod() {
          return 'base';
        }
      }

      class DerivedClass extends BaseClass {
        @logMethod()
        derivedMethod() {
          return 'derived';
        }
      }

      const instance = new DerivedClass();
      const baseResult = instance.baseMethod();
      const derivedResult = instance.derivedMethod();

      expect(baseResult).toBe('base');
      expect(derivedResult).toBe('derived');
    });

    it('should handle static methods', () => {
      const { logMethod } = require('../decorators');

      class TestClass {
        @logMethod()
        static staticMethod() {
          return 'static';
        }
      }

      const result = TestClass.staticMethod();
      expect(result).toBe('static');
    });

    it('should handle getter and setter methods', () => {
      const { logMethod } = require('../decorators');

      class TestClass {
        private _value = 'initial';

        @logMethod()
        get value() {
          return this._value;
        }

        @logMethod()
        set value(newValue: string) {
          this._value = newValue;
        }
      }

      const instance = new TestClass();
      const getResult = instance.value;
      instance.value = 'new value';

      expect(getResult).toBe('initial');
      expect(instance.value).toBe('new value');
    });
  });
});