// QUALIA.CODE v1.2 - Test for @validateEventProperty Decorator
// Comprehensive unit tests with full isolation, High-Fidelity mocking, and event property validation

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ILogger } from '../../../services/interfaces/ILogger';

// Mock schemaRegistry module-level
vi.mock('../../../schemas', () => ({
  schemaRegistry: {
    ValidPropertySchema: {
      safeParse: vi.fn().mockReturnValue({ success: true })
    },
    InvalidPropertySchema: {
      safeParse: vi.fn().mockReturnValue({
        success: false,
        error: {
          message: 'Property validation failed',
          issues: [{ path: ['property'], message: 'Invalid property value' }]
        }
      })
    }
  }
}));

// Import after mocking
import { validateEventProperty } from '../validate-event-property.decorator';

describe('@validateEventProperty Decorator', () => {
  let mockLogger: ILogger;
  
  beforeEach(() => {
    // High-Fidelity Mock: All methods return undefined (void return type)
    mockLogger = {
      debug: vi.fn().mockReturnValue(undefined),
      info: vi.fn().mockReturnValue(undefined),
      warn: vi.fn().mockReturnValue(undefined),
      error: vi.fn().mockReturnValue(undefined)
    };
    
    // Reset mock call counts
    vi.clearAllMocks();
  });

  it('should validate event property successfully and execute method when validation passes', () => {
    class TestClass {
      logger = mockLogger;
      
      @validateEventProperty('qualiaState', 'ValidPropertySchema')
      handleEvent(event: { qualiaState: { value: number } }): string {
        return `processed: ${event.qualiaState.value}`;
      }
    }

    const instance = new TestClass();
    const event = { qualiaState: { value: 42 } };
    const result = instance.handleEvent(event);

    expect(result).toBe('processed: 42');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('✅ Event property validation passed for qualiaState.ValidPropertySchema in TestClass.handleEvent')
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should reject invalid property data, log structured error, and throw without executing method', () => {
    class TestClass {
      logger = mockLogger;
      
      @validateEventProperty('qualiaState', 'InvalidPropertySchema')
      handleEvent(event: { qualiaState: { value: number } }): string {
        return `processed: ${event.qualiaState.value}`;
      }
    }

    const instance = new TestClass();
    const event = { qualiaState: { value: -1 } };

    expect(() => instance.handleEvent(event)).toThrow('Event property validation failed');
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Event property validation failed for qualiaState.InvalidPropertySchema in TestClass.handleEvent'),
      expect.objectContaining({
        error: expect.stringContaining('Property validation failed'),
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['property'], message: 'Invalid property value' })
        ]),
        receivedPropertyData: { value: -1 }
      })
    );
  });

  it('should throw error when property does not exist in event object', () => {
    class TestClass {
      logger = mockLogger;
      
      @validateEventProperty('missingProperty', 'ValidPropertySchema')
      handleEvent(event: { otherProperty: string }): string {
        return 'should not execute';
      }
    }

    const instance = new TestClass();
    const event = { otherProperty: 'test' };

    expect(() => instance.handleEvent(event)).toThrow("Property 'missingProperty' not found in event object");
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Event property validation failed for missingProperty in TestClass.handleEvent'),
      expect.objectContaining({
        error: "Property 'missingProperty' not found in event object"
      })
    );
  });

  it('should throw error when schema does not exist in registry', () => {
    class TestClass {
      logger = mockLogger;
      
      @validateEventProperty('qualiaState', 'NonExistentSchema')
      handleEvent(event: { qualiaState: unknown }): string {
        return 'should not execute';
      }
    }

    const instance = new TestClass();
    const event = { qualiaState: { value: 42 } };

    expect(() => instance.handleEvent(event)).toThrow("Schema 'NonExistentSchema' not found in registry");
    
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Schema not found: NonExistentSchema'),
      expect.objectContaining({
        error: "Schema 'NonExistentSchema' not found in registry"
      })
    );
  });

  it('should skip validation when event is not an object or is missing', () => {
    class TestClass {
      logger = mockLogger;
      
      @validateEventProperty('qualiaState', 'ValidPropertySchema')
      handleEvent(event?: unknown): string {
        return 'executed';
      }
    }

    const instance = new TestClass();

    // The decorator checks: args.length > 0 && args[0] && typeof args[0] === 'object'
    // If check fails, validation is skipped and method executes normally
    const resultNoArg = instance.handleEvent();
    expect(resultNoArg).toBe('executed');
    
    // These should not throw - they just execute without validation
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should validate nested property structures correctly', () => {
    class TestClass {
      logger = mockLogger;
      
      @validateEventProperty('metadata', 'ValidPropertySchema')
      handleEvent(event: { metadata: { timestamp: string; source: string } }): string {
        return `processed: ${event.metadata.source}`;
      }
    }

    const instance = new TestClass();
    const event = { 
      metadata: { 
        timestamp: '2025-10-04T12:00:00Z', 
        source: 'test-source' 
      } 
    };
    const result = instance.handleEvent(event);

    expect(result).toBe('processed: test-source');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('✅ Event property validation passed')
    );
  });

  it('should handle property with undefined value explicitly as an error', () => {
    class TestClass {
      logger = mockLogger;
      
      @validateEventProperty('optionalProperty', 'ValidPropertySchema')
      handleEvent(event: { optionalProperty?: string }): string {
        return 'should not execute';
      }
    }

    const instance = new TestClass();
    const event = {}; // optionalProperty is undefined

    expect(() => instance.handleEvent(event)).toThrow("Property 'optionalProperty' not found in event object");
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
