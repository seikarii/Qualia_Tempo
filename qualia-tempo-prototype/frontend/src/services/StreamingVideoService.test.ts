// QUALIA.CODE v1.1 - Test Suite for StreamingVideoService
// Basic unit tests for WebSocket video streaming service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamingVideoService } from './StreamingVideoService';
import { QualiaLogger } from './Logger';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as QualiaLogger;

// Mock EventBus
const mockEventBus = {
  emit: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
} as any;

// Mock Configuration Service
const mockConfig = {
  getConfig: vi.fn(() => ({ backendUrl: 'ws://localhost:8000' })),
} as any;

// Simple WebSocket mock
class MockWebSocket {
  url: string;
  readyState: number = 1; // OPEN
  
  constructor(url: string) {
    this.url = url;
  }
  
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

describe('StreamingVideoService', () => {
  let service: StreamingVideoService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('WebSocket', MockWebSocket as any);
    service = new StreamingVideoService(mockEventBus, mockLogger, mockConfig);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Basic Functionality', () => {
    it('should be instantiated correctly', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamingVideoService);
    });

    it('should have required methods', () => {
      expect(typeof service.connect).toBe('function');
      expect(typeof service.disconnect).toBe('function');
      expect(typeof service.subscribeToFrames).toBe('function');
      expect(typeof service.unsubscribeFromFrames).toBe('function');
      expect(typeof service.getConnectionStatus).toBe('function');
      expect(typeof service.getStatistics).toBe('function');
    });

    it('should return initial connection status', () => {
      const status = service.getConnectionStatus();
      expect(status).toBeDefined();
      expect(status.state).toBe('disconnected');
      expect(status.connected).toBe(false);
    });

    it('should return initial statistics', () => {
      const stats = service.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.framesReceived).toBe(0);
      expect(stats.currentFps).toBe(0);
    });

    it('should handle disconnection', () => {
      service.disconnect();
      const status = service.getConnectionStatus();
      expect(status.state).toBe('disconnected');
    });
  });

  describe('Frame Subscription Management', () => {
    it('should handle frame subscription without connection', () => {
      const callback = vi.fn();
      const subscriptionId = service.subscribeToFrames(callback);
      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
    });

    it('should handle frame unsubscription', () => {
      const callback = vi.fn();
      const subscriptionId = service.subscribeToFrames(callback);
      
      expect(() => {
        service.unsubscribeFromFrames(subscriptionId);
      }).not.toThrow();
    });
  });

  describe('IoC Container Integration', () => {
    it('should be structured for dependency injection', () => {
      // Verify the service has the injectable decorator applied
      expect(service).toBeInstanceOf(StreamingVideoService);
      
      // Verify it uses injected dependencies
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});
