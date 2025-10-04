// QUALIA.CODE v1.2 - Test for @OnEvent Decorator
// Tests event subscription lifecycle management

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnEvent, initializeEventSubscriptions, cleanupEventSubscriptions } from '../on-event.decorator';
import type { ILogger } from '../../../services/interfaces/ILogger';
import type { IEventBus } from '../shared-types';

describe('@OnEvent Decorator and Lifecycle', () => {
  let mockLogger: ILogger;
  let mockEventBus: IEventBus;
  
  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    
    mockEventBus = {
      emit: vi.fn(),
      subscribe: vi.fn().mockReturnValue('listener-id-1'),
      unsubscribe: vi.fn()
    };
  });

  it('should store subscription metadata on class', () => {
    class TestClass {
      logger = mockLogger;
      eventBus = mockEventBus;
      _eventListeners: string[] = [];
      
      @OnEvent('TestEvent')
      handleTestEvent(event: unknown): void {
        // Handler logic
      }
    }

    const Constructor = TestClass as any;
    expect(Constructor._eventSubscriptions).toBeDefined();
    expect(Constructor._eventSubscriptions).toHaveLength(1);
    expect(Constructor._eventSubscriptions[0]).toMatchObject({
      eventType: 'TestEvent',
      methodName: 'handleTestEvent'
    });
  });

  it('should initialize subscriptions when initializeEventSubscriptions is called', () => {
    class TestClass {
      logger = mockLogger;
      eventBus = mockEventBus;
      _eventListeners: string[] = [];
      
      @OnEvent('TestEvent')
      handleTestEvent(event: unknown): void {
        // Handler logic
      }
    }

    const instance = new TestClass();
    initializeEventSubscriptions(instance);

    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      'TestEvent',
      expect.any(Function),
      { priority: 'normal' }
    );
    
    expect(instance._eventListeners).toHaveLength(1);
    expect(instance._eventListeners[0]).toBe('listener-id-1');
  });

  it('should cleanup subscriptions when cleanupEventSubscriptions is called', () => {
    class TestClass {
      logger = mockLogger;
      eventBus = mockEventBus;
      _eventListeners: string[] = ['listener-id-1', 'listener-id-2'];
      
      @OnEvent('TestEvent')
      handleTestEvent(event: unknown): void {}
    }

    const instance = new TestClass();
    cleanupEventSubscriptions(instance);

    expect(mockEventBus.unsubscribe).toHaveBeenCalledTimes(2);
    expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-id-1');
    expect(mockEventBus.unsubscribe).toHaveBeenCalledWith('listener-id-2');
    expect(instance._eventListeners).toHaveLength(0);
  });

  it('should log event reception', () => {
    class TestClass {
      logger = mockLogger;
      eventBus = mockEventBus;
      _eventListeners: string[] = [];
      
      @OnEvent('TestEvent')
      handleTestEvent(event: unknown): void {}
    }

    const instance = new TestClass();
    instance.handleTestEvent({ data: 'test' });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('📡 [TestClass] Event received: TestEvent'),
      expect.objectContaining({ method: 'handleTestEvent' })
    );
  });
});
