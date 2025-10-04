/**
 * QUALIA.CODE v1.2 - Decorator Tests
 * Comprehensive test suite for all decorators
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'inversify';
import { TYPES } from '../../services/inversify.types';
import type { IEventBus } from '../../services/interfaces/IEventBus';
import type { ILogger } from '../../services/interfaces/ILogger';
import type { IMessageAdapter } from '../../services/protocol/IMessageAdapter';

// Import the REAL decorators (not mocked)
import {
  logMethod,
  catchError,
  measureTime,
  BrowserOnly,
  AdaptAndEmit,
} from '../decorators';

describe('Decorators', () => {
  describe('@logMethod', () => {
    it('should log method entry and exit', () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      class TestClass {
        logger = mockLogger;

        @logMethod
        testMethod(arg: string): string {
          return 'result-' + arg;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod('test');

      expect(result).toBe('result-test');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('→ ENTER TestClass.testMethod'),
        expect.any(Object)
      );
    });
  });

  describe('@catchError', () => {
    it('should catch and log synchronous errors', () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      class TestClass {
        logger = mockLogger;

        @catchError
        throwingMethod(): void {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();
      expect(() => instance.throwingMethod()).toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('TestClass.throwingMethod'),
        expect.objectContaining({
          error: 'Test error',
        })
      );
    });
  });

  describe('@AdaptAndEmit - IoC Compliant', () => {
    let container: Container;
    let mockEventBus: IEventBus;
    let mockLogger: ILogger;
    let mockAdapter: IMessageAdapter;

    beforeEach(() => {
      container = new Container();

      mockEventBus = {
        emit: vi.fn(),
        subscribe: vi.fn().mockReturnValue('listener-id'),
        unsubscribe: vi.fn(),
        clear: vi.fn(),
        getEventHistory: vi.fn().mockReturnValue([]),
        getSubscriptionCount: vi.fn().mockReturnValue(0),
      };

      mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      mockAdapter = {
        adapt: vi.fn((rawData: unknown) => ({
          type: 'TestEvent',
          source: 'test',
          data: rawData,
        })),
      };

      container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
      container.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
      container.bind<IMessageAdapter>(TYPES.IRawToParticleEventAdapter).toConstantValue(mockAdapter);
    });

    it('should resolve adapter and eventBus from IoC container', () => {
      class TestService {
        logger = mockLogger;

        @AdaptAndEmit(TYPES.IRawToParticleEventAdapter)
        onRawData(rawData: ArrayBuffer): void {
          void rawData;
        }
      }

      const service = new TestService();
      const testData = new ArrayBuffer(8);
      
      service.onRawData(testData);

      expect(mockAdapter.adapt).toHaveBeenCalledWith(testData);
      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'TestEvent',
        source: 'test',
        data: testData,
      });
    });

    it('should handle adapter errors gracefully', () => {
      const errorAdapter: IMessageAdapter = {
        adapt: vi.fn(() => {
          throw new Error('Adapter error');
        }),
      };

      container.rebind<IMessageAdapter>(TYPES.IRawToParticleEventAdapter).toConstantValue(errorAdapter);

      class TestService {
        logger = mockLogger;

        @AdaptAndEmit(TYPES.IRawToParticleEventAdapter)
        onRawData(rawData: ArrayBuffer): void {
          void rawData;
        }
      }

      const service = new TestService();
      const testData = new ArrayBuffer(8);

      expect(() => service.onRawData(testData)).toThrow('Adapter error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 @AdaptAndEmit failed'),
        expect.any(Object)
      );
    });
  });
});
