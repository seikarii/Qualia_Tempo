// QUALIA.CODE v1.2 - Test for @BrowserOnly Decorator
// Tests browser environment abstraction

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserOnly } from '../browser-only.decorator';
import type { ILogger } from '../../../services/interfaces/ILogger';

describe('@BrowserOnly Decorator', () => {
  let mockLogger: ILogger;
  
  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
  });

  it('should execute method in browser environment', () => {
    // window is available in Vitest by default
    class TestClass {
      logger = mockLogger;
      
      @BrowserOnly
      getBrowserInfo(): string {
        return 'browser info';
      }
    }

    const instance = new TestClass();
    const result = instance.getBrowserInfo();

    expect(result).toBe('browser info');
  });

  it('should not execute method in non-browser environment and log warning', () => {
    // Mock non-browser environment
    const originalWindow = global.window;
    // @ts-expect-error - intentionally deleting window for test
    delete global.window;

    class TestClass {
      logger = mockLogger;
      
      @BrowserOnly
      getBrowserInfo(): string {
        return 'should not execute';
      }
    }

    const instance = new TestClass();
    const result = instance.getBrowserInfo();

    expect(result).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Cannot execute TestClass.getBrowserInfo in a non-browser environment')
    );

    // Restore window
    global.window = originalWindow;
  });
});
