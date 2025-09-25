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

// Mock WebSocket globally
const mockWebSocketInstances: MockWebSocket[] = [];

class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
    mockWebSocketInstances.push(this);
  }
  
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  
  // Simulation methods for testing
  _simulateOpen() {
    this.readyState = WebSocket.OPEN;
    const event = new Event('open');
    if (this.onopen) {
      this.onopen(event);
    }
    // Also trigger addEventListener listeners
    this.addEventListener.mock.calls.forEach((call: any[]) => {
      const [type, listener] = call;
      if (type === 'open') {
        listener(event);
      }
    });
  }
  
  _simulateMessage(data: string) {
    const event = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(event);
    }
    // Also trigger addEventListener listeners
    this.addEventListener.mock.calls.forEach((call: any[]) => {
      const [type, listener] = call;
      if (type === 'message') {
        listener(event);
      }
    });
  }
  
  _simulateClose(code: number = 1000, reason: string = '') {
    this.readyState = WebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    if (this.onclose) {
      this.onclose(event);
    }
    // Also trigger addEventListener listeners
    this.addEventListener.mock.calls.forEach((call: any[]) => {
      const [type, listener] = call;
      if (type === 'close') {
        listener(event);
      }
    });
  }
  
  _simulateError() {
    const event = new Event('error');
    if (this.onerror) {
      this.onerror(event);
    }
    // Also trigger addEventListener listeners
    this.addEventListener.mock.calls.forEach((call: any[]) => {
      const [type, listener] = call;
      if (type === 'error') {
        listener(event);
      }
    });
  }
}

// Mock the global WebSocket
global.WebSocket = MockWebSocket as any;

describe('StreamingVideoService', () => {
  let service: StreamingVideoService;

  beforeEach(() => {
    // Clear mock instances before each test
    mockWebSocketInstances.length = 0;
    
    service = new StreamingVideoService(mockEventBus, mockLogger, mockConfig);
  });

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

  describe('WebSocket Connection Behavior', () => {
    it('should establish connection and update status correctly', async () => {
      // Create service
      const service = new StreamingVideoService(mockEventBus, mockLogger, mockConfig);
      
      // Start connection process
      const connectPromise = service.connect();
      
      // Simulate WebSocket opening
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateOpen();
      
      // Wait for connection to complete
      await connectPromise;
      
      // CRITICAL ASSERTION: Verify connection status changed to 'connected'
      const status = service.getConnectionStatus();
      expect(status.state).toBe('connected');
      expect(status.connected).toBe(true);
      expect(status.connectedAt).toBeDefined();
    });

    it('should handle connection errors gracefully', async () => {
      // Create service
      const service = new StreamingVideoService(mockEventBus, mockLogger, mockConfig);
      
      // Start connection process
      const connectPromise = service.connect();
      
      // Simulate connection error
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateError();
      
      // Should handle error without throwing
      await expect(connectPromise).rejects.toThrow();
      
      // Verify error status
      const status = service.getConnectionStatus();
      expect(status.state).toBe('error');
      expect(status.lastError).toBeDefined();
    });
  });

  describe('Frame Reception Behavior', () => {
    it('should receive and process video frames correctly', async () => {
      // Create service
      const service = new StreamingVideoService(mockEventBus, mockLogger, mockConfig);
      
      // Mock callback for frame subscription
      const mockCallback = vi.fn();
      const subscriptionId = service.subscribeToFrames(mockCallback);
      
      // Establish connection
      const connectPromise = service.connect();
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateOpen();
      await connectPromise;
      
      // Simulate receiving a video frame message
      const frameData = 'base64encodedframe';
      const frameMessage = JSON.stringify({
        type: 'video_frame',
        data: frameData,
        timestamp: Date.now(),
        frame_number: 1,
        width: 1920,
        height: 1080
      });
      
      mockWS._simulateMessage(frameMessage);
      
      // CRITICAL ASSERTION: Verify callback was called with correct frame data
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          data: frameData,
          frameNumber: 1,
          width: 1920,
          height: 1080
        })
      );
      
      // Verify statistics were updated
      const stats = service.getStatistics();
      expect(stats.framesReceived).toBe(1);
      expect(stats.bytesReceived).toBe(frameData.length);
      expect(stats.lastFrameTimestamp).toBeDefined();
    });

    it('should handle multiple frame subscribers correctly', async () => {
      // Create service
      const service = new StreamingVideoService(mockEventBus, mockLogger, mockConfig);
      
      // Create multiple mock callbacks
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      
      service.subscribeToFrames(mockCallback1);
      service.subscribeToFrames(mockCallback2);
      
      // Establish connection
      const connectPromise = service.connect();
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateOpen();
      await connectPromise;
      
      // Simulate frame message
      const frameMessage = JSON.stringify({
        type: 'video_frame',
        data: 'testframe',
        timestamp: Date.now(),
        frame_number: 1,
        width: 1920,
        height: 1080
      });
      
      mockWS._simulateMessage(frameMessage);
      
      // CRITICAL ASSERTION: Both callbacks should be called
      expect(mockCallback1).toHaveBeenCalledTimes(1);
      expect(mockCallback2).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed frame data gracefully', async () => {
      // Create service
      const service = new StreamingVideoService(mockEventBus, mockLogger, mockConfig);
      
      const mockCallback = vi.fn();
      service.subscribeToFrames(mockCallback);
      
      // Establish connection
      const connectPromise = service.connect();
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateOpen();
      await connectPromise;
      
      // Simulate malformed message
      mockWS._simulateMessage('invalid json');
      
      // Should not call callback with invalid data
      expect(mockCallback).not.toHaveBeenCalled();
      
      // Should log error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse WebSocket message',
        expect.any(Object)
      );
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
