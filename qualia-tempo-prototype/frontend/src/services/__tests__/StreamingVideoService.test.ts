// QUALIA.CODE v1.1 - Test Suite for StreamingVideoService
// Basic unit tests for WebSocket video streaming service

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestContainer,
  getMocksFromContainer,
  resetAllMocks,
} from "../../testing/test-container-factory";
import { Container } from "inversify";
import { TYPES } from "../inversify.types";
import type { IStreamingVideoService } from "../interfaces/IStreamingVideoService";

// Mock logger
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

// Mock EventBus
const mockEventBus = {
  emit: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
} as any;

// Mock Configuration Service
const mockConfig = {
  getConfig: vi.fn(() => ({ backendUrl: "ws://localhost:8000" })),
} as any;

// Mock WebSocket globally
const mockWebSocketInstances: MockWebSocket[] = [];

class MockWebSocket {
  static instances = mockWebSocketInstances;
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private listeners: { [key: string]: Function[] } = {};

  constructor(url: string) {
    this.url = url;
    mockWebSocketInstances.push(this);
    MockWebSocket.instances.push(this);
  }

  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this._simulateClose(1000, "Client closed");
  });

  addEventListener = vi.fn((type: string, listener: Function) => {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  });

  removeEventListener = vi.fn((type: string, listener: Function) => {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  });

  private _dispatchEvent(type: string, event: Event) {
    if (typeof (this as any)[`on${type}`] === "function") {
      (this as any)[`on${type}`](event);
    }
    (this.listeners[type] || []).forEach((listener) => listener(event));
  }

  _simulateOpen() {
    this.readyState = WebSocket.OPEN;
    this._dispatchEvent("open", new Event("open"));
  }

  _simulateMessage(data: any) {
    this._dispatchEvent("message", new MessageEvent("message", { data }));
  }

  _simulateClose(code = 1000, reason = "Closed") {
    this.readyState = WebSocket.CLOSED;
    this._dispatchEvent("close", new CloseEvent("close", { code, reason }));
  }

  _simulateError() {
    this.readyState = WebSocket.CLOSED;
    this._dispatchEvent("error", new Event("error"));
  }
}

// Mock the global WebSocket
global.WebSocket = MockWebSocket as any;

describe("StreamingVideoService", () => {
  let container: Container;
  let service: IStreamingVideoService;
  let mocks: ReturnType<typeof getMocksFromContainer>;

  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();

    // Clear mock instances between tests
    mockWebSocketInstances.length = 0;

    // Create isolated test container
    container = createTestContainer();
    mocks = getMocksFromContainer(container);

    // Get service instance from test container - NO MANUAL INSTANTIATION
    service = container.get<IStreamingVideoService>(
      TYPES.IStreamingVideoService,
    );

    // Mock WebSocket globally
    vi.stubGlobal("WebSocket", MockWebSocket as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Basic Functionality", () => {
    it("should be instantiated correctly", () => {
      expect(service).toBeDefined();
      expect(typeof service.connect).toBe("function");
      expect(typeof service.disconnect).toBe("function");
      expect(typeof service.subscribeToFrames).toBe("function");
      expect(typeof service.unsubscribeFromFrames).toBe("function");
      expect(typeof service.getConnectionStatus).toBe("function");
      expect(typeof service.getStatistics).toBe("function");
    });

    it("should have required methods", () => {
      expect(typeof service.connect).toBe("function");
      expect(typeof service.disconnect).toBe("function");
      expect(typeof service.subscribeToFrames).toBe("function");
      expect(typeof service.unsubscribeFromFrames).toBe("function");
      expect(typeof service.getConnectionStatus).toBe("function");
      expect(typeof service.getStatistics).toBe("function");
    });

    it("should return initial connection status", () => {
      const status = service.getConnectionStatus();
      expect(status).toBeDefined();
      expect(status.state).toBe("IDLE");
      expect(status.connected).toBe(false);
    });

    it("should return initial statistics", () => {
      const stats = service.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.framesReceived).toBe(0);
      expect(stats.currentFps).toBe(0);
    });

    it("should handle disconnection", () => {
      service.disconnect();
      const status = service.getConnectionStatus();
      expect(status.state).toBe("IDLE");
    });
  });

  describe("WebSocket Connection Behavior", () => {
    it("should establish connection and update status correctly", async () => {
      // Start connection process
      const connectPromise = service.connect();

      // Simulate WebSocket opening
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateOpen();

      // Wait for connection to complete
      await connectPromise;

      // CRITICAL ASSERTION: Verify connection status changed to 'connected'
      const status = service.getConnectionStatus();
      expect(status.state).toBe("connected");
      expect(status.connected).toBe(true);
      expect(status.connectedAt).toBeDefined();
    });

    it("should handle connection errors gracefully", async () => {
      // El método connect() está diseñado para NO rechazar la promesa.
      // En su lugar, maneja el error internamente y actualiza el estado.
      const connectPromise = service.connect();

      // Simula un error de conexión
      const mockWS = mockWebSocketInstances[mockWebSocketInstances.length - 1];
      mockWS._simulateError();

      // Esperamos a que la lógica interna de connect() termine
      await connectPromise;

      // Verificamos que el estado del servicio refleje el error
      const status = service.getConnectionStatus();
      expect(status.state).toBe("ERROR");
      expect(status.connected).toBe(false);
      expect(status.lastError).toBeDefined();
    });
  });

  describe("Frame Reception Behavior", () => {
    it("should receive and process video frames correctly", async () => {
      // Mock callback for frame subscription
      const mockCallback = vi.fn();
      const subscriptionId = service.subscribeToFrames(mockCallback);

      // Establish connection
      const connectPromise = service.connect();
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateOpen();
      await connectPromise;

      // Simulate receiving a video frame message
      const frameData = "base64encodedframe";
      const frameMessage = JSON.stringify({
        type: "video_frame",
        data: frameData,
        timestamp: Date.now(),
        frame_number: 1,
        width: 1920,
        height: 1080,
      });

      mockWS._simulateMessage(frameMessage);

      // CRITICAL ASSERTION: Verify callback was called with correct frame data
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          data: frameData,
          frameNumber: 1,
          width: 1920,
          height: 1080,
        }),
      );

      // Verify statistics were updated
      const stats = service.getStatistics();
      expect(stats.framesReceived).toBe(1);
      expect(stats.bytesReceived).toBe(frameData.length);
      expect(stats.lastFrameTimestamp).toBeDefined();
    });

    it("should handle multiple frame subscribers correctly", async () => {
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
        type: "video_frame",
        data: "testframe",
        timestamp: Date.now(),
        frame_number: 1,
        width: 1920,
        height: 1080,
      });

      mockWS._simulateMessage(frameMessage);

      // CRITICAL ASSERTION: Both callbacks should be called
      expect(mockCallback1).toHaveBeenCalledTimes(1);
      expect(mockCallback2).toHaveBeenCalledTimes(1);
    });

    it("should handle malformed frame data gracefully", async () => {
      const mockCallback = vi.fn();
      service.subscribeToFrames(mockCallback);

      // Establish connection
      const connectPromise = service.connect();
      const mockWS = mockWebSocketInstances[0];
      mockWS._simulateOpen();
      await connectPromise;

      // Simulate malformed message
      mockWS._simulateMessage("invalid json");

      // Should not call callback with invalid data
      expect(mockCallback).not.toHaveBeenCalled();

      // Should log error
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        "Failed to parse WebSocket message",
        expect.any(Object),
      );
    });
  });

  describe("IoC Container Integration", () => {
    it("should be structured for dependency injection", () => {
      // Verify the service is properly resolved from container
      expect(service).toBeDefined();

      // Verify it has required methods (interface compliance)
      expect(typeof service.connect).toBe("function");
      expect(typeof service.disconnect).toBe("function");
      expect(typeof service.subscribeToFrames).toBe("function");
      expect(typeof service.unsubscribeFromFrames).toBe("function");
      expect(typeof service.getConnectionStatus).toBe("function");
      expect(typeof service.getStatistics).toBe("function");
    });
  });
});
