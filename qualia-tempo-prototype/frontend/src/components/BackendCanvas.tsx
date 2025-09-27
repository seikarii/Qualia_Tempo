/**
 * QUALIA.CODE v1.1 - BackendCanvas Component
 * Displays real-time rendered frames from backend moderngl engine.
 * Replaces DOM-based particle simulation with GPU-streamed visuals.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useStreamingVideoService, useLogger } from "../services/hooks";
import type {
  VideoFrame,
  ConnectionStatus,
} from "../services/interfaces/IStreamingVideoService";

interface BackendCanvasProps {
  /** Canvas width (default: full viewport) */
  width?: number;
  /** Canvas height (default: full viewport) */
  height?: number;
  /** Canvas quality for scaling (default: 1) */
  quality?: number;
  /** Whether to show connection status overlay */
  showStatus?: boolean;
  /** CSS class name for styling */
  className?: string;
}

/**
 * BackendCanvas - The definitive visual canvas for Qualia Tempo.
 *
 * This component represents the architectural shift from DOM-based effects
 * to true GPU-accelerated rendering. It receives JPEG frames from the
 * backend's moderngl engine and displays them with minimal latency.
 *
 * Key Features:
 * - WebSocket-based frame streaming
 * - Automatic reconnection handling
 * - Performance monitoring
 * - Graceful degradation
 */
const BackendCanvas: React.FC<BackendCanvasProps> = ({
  width,
  height,
  quality = 1,
  showStatus = false,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const streamingService = useStreamingVideoService();
  const logger = useLogger();

  // Component state - QUALIA.CODE: Only simple primitives in useState
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("DISCONNECTED");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastFrame, setLastFrame] = useState<VideoFrame | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  
  // Derived connection status object (computed, not stored in state)
  const connectionStatus: ConnectionStatus = {
    connected: isConnected,
    state: connectionState as ConnectionStatus['state'],
    reconnectAttempts: reconnectAttempts,
  };

  // Canvas dimensions
  const canvasWidth = width || window.innerWidth;
  const canvasHeight = height || window.innerHeight;

  /**
   * Initialize canvas context and setup
   */
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get 2D rendering context
    const ctx = canvas.getContext("2d", {
      alpha: false, // QUALIA.CODE v1.1 FIX: Disable alpha for better particle visibility
      desynchronized: true, // Allow asynchronous rendering
    });

    if (!ctx) {
      logger.error("Failed to get 2D canvas context");
      return;
    }

    contextRef.current = ctx;

    // Set canvas size
    canvas.width = canvasWidth * quality;
    canvas.height = canvasHeight * quality;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // Scale context for quality
    ctx.scale(quality, quality);

    // Set image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // QUALIA.CODE v1.1 FIX: Initialize with dark base for particle visibility
    ctx.fillStyle = "rgba(5, 5, 15, 1.0)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    setIsCanvasReady(true);
    logger.info("BackendCanvas initialized", {
      width: canvasWidth,
      height: canvasHeight,
      quality,
    });
  }, [canvasWidth, canvasHeight, quality, logger]);

  /**
   * Handle incoming video frames from streaming service
   */
  const handleVideoFrame = useCallback(
    (frame: VideoFrame) => {
      const ctx = contextRef.current;
      if (!ctx || !isCanvasReady) return;

      try {
        // Create image from base64 data
        const img = new Image();

        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          // QUALIA.CODE v1.1 FIX: Provide subtle base for GPU particle visibility
          ctx.fillStyle = "rgba(5, 5, 15, 0.95)"; // Very dark blue-black base
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // Set enhanced blending for particle visibility
          ctx.globalCompositeOperation = "screen"; // Additive blending for particles

          // Draw frame to canvas (scaled to fit)
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

          // Reset composite operation
          ctx.globalCompositeOperation = "source-over";

          // Update frame tracking
          setLastFrame(frame);
          setFrameCount((prev) => {
            const newCount = prev + 1;
            // Debug logging every 30 frames (roughly once per second at 30 FPS)
            if (newCount % 30 === 0) {
              logger.info("BackendCanvas rendering frames", {
                frameCount: newCount,
                frameSize: `${img.width}x${img.height}`,
                timestamp: frame.timestamp,
                dataSize: frame.data.length,
              });
            }
            return newCount;
          });
        };

        img.onerror = () => {
          logger.error("Failed to load video frame image");
        };

        // Set image source (base64 JPEG)
        img.src = `data:image/jpeg;base64,${frame.data}`;
      } catch (error) {
        logger.error("Error handling video frame", { error });
      }
    },
    [isCanvasReady, canvasWidth, canvasHeight, logger],
  );

  /**
   * Update connection status from streaming service
   */
  const updateConnectionStatus = useCallback(() => {
    const status = streamingService.getConnectionStatus();
    setIsConnected(status.connected);
    setConnectionState(status.state);
    setReconnectAttempts(status.reconnectAttempts);

    // Activate fallback if disconnected for too long
    if (!status.connected && status.reconnectAttempts > 3) {
      setShowFallback(true);
    } else if (status.connected) {
      setShowFallback(false);
    }
  }, [streamingService]);

  /**
   * Fallback animation when backend is unavailable
   */
  const startFallbackAnimation = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx || !isCanvasReady) return;

    let animationId: number;

    const animate = (time: number) => {
      // Simple particle-like fallback animation
      ctx.fillStyle = "rgba(5, 5, 15, 0.1)";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw some animated particles as fallback
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time * 0.001 + i) * 0.3 + 0.5) * canvasWidth;
        const y = (Math.cos(time * 0.0007 + i * 2) * 0.3 + 0.5) * canvasHeight;
        const size = Math.sin(time * 0.002 + i) * 3 + 5;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(
          0,
          `rgba(0, 255, 255, ${0.8 * Math.sin(time * 0.003 + i) + 0.2})`,
        );
        gradient.addColorStop(1, "rgba(0, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (showFallback) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [canvasWidth, canvasHeight, isCanvasReady, showFallback]);

  // Initialize canvas on mount
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  // Setup streaming service and frame subscription
  useEffect(() => {
    let frameSubscriptionId: string | null = null;
    let statusInterval: ReturnType<typeof setInterval> | null = null;

    const setupStreaming = async () => {
      try {
        // Subscribe to video frames
        frameSubscriptionId =
          streamingService.subscribeToFrames(handleVideoFrame);

        // Setup status monitoring
        statusInterval = setInterval(updateConnectionStatus, 1000);

        // Connect to stream (don't fail if connection fails)
        try {
          await streamingService.connect();
          logger.info("BackendCanvas connected to video stream");
          setShowFallback(false);
        } catch (error) {
          logger.warn(
            "BackendCanvas failed to connect to video stream - activating fallback mode",
            { error },
          );
          setShowFallback(true);
          startFallbackAnimation();
        }
      } catch (error) {
        logger.error("Failed to setup video streaming", { error });
      }
    };

    const cleanupStreaming = async () => {
      if (frameSubscriptionId) {
        streamingService.unsubscribeFromFrames(frameSubscriptionId);
      }

      if (statusInterval) {
        clearInterval(statusInterval);
      }

      await streamingService.disconnect();
    };

    setupStreaming();

    // Cleanup on unmount
    return () => {
      cleanupStreaming();
    };
  }, [streamingService, handleVideoFrame, updateConnectionStatus, logger]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Reinitialize canvas on resize if using viewport dimensions
      if (!width || !height) {
        initializeCanvas();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [width, height, initializeCanvas]);

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Main canvas for backend-rendered frames */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          imageRendering: "crisp-edges", // Sharp pixel rendering
          backgroundColor: "rgba(5, 5, 15, 1.0)", // QUALIA.CODE v1.1 FIX: Dark base for visibility
        }}
        aria-label="Qualia Tempo Visual Effects Canvas"
      />

      {/* Connection status overlay (optional) */}
      {showStatus && (
        <div className="absolute top-4 left-4 z-50 bg-black bg-opacity-75 text-white p-2 rounded text-sm font-mono">
          <div
            className={`flex items-center gap-2 ${
              connectionStatus.connected ? "text-green-400" : "text-red-400"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus.connected ? "bg-green-400" : "bg-red-400"
              }`}
            />
            {connectionStatus.state.toUpperCase()}
          </div>

          {connectionStatus.connected && lastFrame && (
            <>
              <div className="text-cyan-400">Frames: {frameCount}</div>
              <div className="text-cyan-400">
                Frame #: {lastFrame.frameNumber}
              </div>
              {streamingService.getStatistics().currentFps > 0 && (
                <div className="text-cyan-400">
                  FPS: {streamingService.getStatistics().currentFps}
                </div>
              )}
            </>
          )}

          {!connectionStatus.connected &&
            connectionStatus.reconnectAttempts > 0 && (
              <div className="text-yellow-400">
                Reconnecting... ({connectionStatus.reconnectAttempts})
              </div>
            )}

          {connectionStatus.lastError && (
            <div className="text-red-400 text-xs mt-1">
              {connectionStatus.lastError}
            </div>
          )}
          {showFallback && (
            <div className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
              <span className="animate-pulse">⚠</span>
              Fallback Mode - GPU Effects Unavailable
            </div>
          )}
        </div>
      )}

      {/* Fallback notification when backend unavailable */}
      {showFallback && !showStatus && (
        <div className="absolute bottom-4 right-4 z-50 bg-yellow-900 bg-opacity-90 text-yellow-200 p-3 rounded text-sm font-mono border border-yellow-600">
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-yellow-400">⚠</span>
            <div>
              <div className="font-semibold">Backend GPU Engine Offline</div>
              <div className="text-xs opacity-75">
                Running CSS fallback visuals
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendCanvas;
