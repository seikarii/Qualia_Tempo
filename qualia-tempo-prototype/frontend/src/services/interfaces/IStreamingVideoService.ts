/**
 * QUALIA.CODE v1.1 - IStreamingVideoService Interface
 * Defines contract for WebSocket video streaming from backend.
 */

export interface IStreamingVideoService {
  /**
   * Connect to backend WebSocket video stream
   * @returns Promise that resolves when connection is established
   */
  connect(): Promise<void>;

  /**
   * Disconnect from backend WebSocket video stream
   * @returns Promise that resolves when disconnection is complete
   */
  disconnect(): Promise<void>;

  /**
   * Subscribe to video frame updates
   * @param callback Function to call when new frame is received
   * @returns Subscription ID that can be used to unsubscribe
   */
  subscribeToFrames(callback: (frame: VideoFrame) => void): string;

  /**
   * Unsubscribe from video frame updates
   * @param subscriptionId ID returned from subscribeToFrames
   */
  unsubscribeFromFrames(subscriptionId: string): void;

  /**
   * Get current connection status
   * @returns Connection status information
   */
  getConnectionStatus(): ConnectionStatus;

  /**
   * Get streaming statistics
   * @returns Current streaming metrics
   */
  getStatistics(): StreamingStatistics;

  /**
   * Request quality change for video stream
   * @param quality JPEG quality (10-100)
   */
  requestQualityChange(quality: number): void;

  /**
   * Request FPS change for video stream
   * @param fps Target frames per second (1-60)
   */
  requestFpsChange(fps: number): void;

  /**
   * Send ping to test connection
   * @returns Promise that resolves with round-trip time in milliseconds
   */
  ping(): Promise<number>;
}

/**
 * Video frame data received from backend
 */
export interface VideoFrame {
  /** Base64 encoded JPEG image data */
  data: string;
  /** Timestamp when frame was generated */
  timestamp: number;
  /** Sequential frame number */
  frameNumber: number;
  /** Frame width in pixels */
  width?: number;
  /** Frame height in pixels */
  height?: number;
}

/**
 * WebSocket connection status
 */
export interface ConnectionStatus {
  /** Whether WebSocket is connected */
  connected: boolean;
  /** Current connection state */
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Last error message if any */
  lastError?: string;
  /** Connection URL */
  url?: string;
  /** Time when connection was established */
  connectedAt?: Date;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

/**
 * Streaming performance statistics
 */
export interface StreamingStatistics {
  /** Total frames received */
  framesReceived: number;
  /** Total bytes received */
  bytesReceived: number;
  /** Current frames per second */
  currentFps: number;
  /** Average frame size in bytes */
  averageFrameSize: number;
  /** Last frame received timestamp */
  lastFrameTimestamp: number;
  /** Connection latency in milliseconds */
  latency: number;
  /** Number of dropped frames */
  droppedFrames: number;
}