// QUALIA.CODE v1.2 - Test for @AdaptAndEmit Decorator
// Validates IoC-compliant implementation without container.get()

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptAndEmit } from '../adapt-and-emit.decorator';
import type { ILogger } from '../../../services/interfaces/ILogger';
import type { IEventBus, IMessageAdapter } from '../shared-types';

describe('@AdaptAndEmit Decorator - IoC Compliant', () => {
  let mockLogger: ILogger;
  let mockEventBus: IEventBus;
  let mockAdapter: IMessageAdapter;
  
  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    
    mockEventBus = {
      emit: vi.fn(),
      subscribe: vi.fn().mockReturnValue('listener-id'),
      unsubscribe: vi.fn()
    };
    
    mockAdapter = {
      adapt: vi.fn().mockReturnValue({
        type: 'TestEvent',
        source: 'TestAdapter',
        data: 'adapted'
      })
    };
  });

  it('should adapt and emit using instance-injected dependencies', () => {
    const adapterSymbol = Symbol.for('testAdapter');
    
    class TestClass {
      logger = mockLogger;
      eventBus = mockEventBus;
      [adapterSymbol] = mockAdapter;
      
      @AdaptAndEmit(adapterSymbol)
      handleRawData(rawData: string): void {
        // Original method logic
      }
    }

    const instance = new TestClass();
    instance.handleRawData('raw data');

    // Verify adapter was called
    expect(mockAdapter.adapt).toHaveBeenCalledWith('raw data');
    
    // Verify event was emitted
    expect(mockEventBus.emit).toHaveBeenCalledWith({
      type: 'TestEvent',
      source: 'TestAdapter',
      data: 'adapted'
    });
  });

  it('should throw architectural violation when eventBus is missing', () => {
    const adapterSymbol = Symbol.for('testAdapter');
    
    class TestClass {
      logger = mockLogger;
      // eventBus is intentionally missing
      [adapterSymbol] = mockAdapter;
      
      @AdaptAndEmit(adapterSymbol)
      handleRawData(rawData: string): void {
        // Original method logic
      }
    }

    const instance = new TestClass();
    
    expect(() => instance.handleRawData('raw data')).toThrow(
      /ARCHITECTURAL VIOLATION.*missing injected dependencies/
    );
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('ARCHITECTURAL VIOLATION'),
      expect.objectContaining({ missingEventBus: true })
    );
  });

  it('should throw architectural violation when adapter is missing', () => {
    const adapterSymbol = Symbol.for('testAdapter');
    
    class TestClass {
      logger = mockLogger;
      eventBus = mockEventBus;
      // adapter is intentionally missing
      
      @AdaptAndEmit(adapterSymbol)
      handleRawData(rawData: string): void {
        // Original method logic
      }
    }

    const instance = new TestClass();
    
    expect(() => instance.handleRawData('raw data')).toThrow(
      /ARCHITECTURAL VIOLATION.*missing injected dependencies/
    );
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('ARCHITECTURAL VIOLATION'),
      expect.objectContaining({ missingAdapter: true })
    );
  });

  it('should log adapter activity', () => {
    const adapterSymbol = Symbol.for('testAdapter');
    
    class TestClass {
      logger = mockLogger;
      eventBus = mockEventBus;
      [adapterSymbol] = mockAdapter;
      
      @AdaptAndEmit(adapterSymbol)
      handleRawData(rawData: string): void {}
    }

    const instance = new TestClass();
    instance.handleRawData('test data');

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('🔄 @AdaptAndEmit processing'),
      expect.objectContaining({ rawDataType: 'string' })
    );
    
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('✅ @AdaptAndEmit completed'),
      expect.objectContaining({ eventType: 'TestEvent' })
    );
  });
});
