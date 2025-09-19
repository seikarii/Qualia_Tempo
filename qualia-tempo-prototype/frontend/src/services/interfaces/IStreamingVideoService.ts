/**
 * QUALIA.CODE v1.1 - IStreamingVideoService Interface
 * Defines contract for WebSocket video streaming from backend.
 * CRISALIDA.CODE v1.1 - SINGLETON REFERENCE COUNTING ARCHITECTURE
 */

// ✅ CORRECT: Importing from the central contracts file
import type { ConnectionStatus, VideoFrame } from '../contracts/events.contracts';

// ✅ CORRECT: Re-exporting for backward compatibility
export type { ConnectionStatus, VideoFrame } from '../contracts/events.contracts';

export interface IStreamingVideoService {
  /**
   * Connect to backend WebSocket video stream
   * @returns Promise that resolves when connection is established
   */
  connect(): Promise<void>;

  /**
   * Disconnect from backend WebSocket video stream
   * Uses reference counting and debounce for safe disconnection
   */
  disconnect(): void;

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