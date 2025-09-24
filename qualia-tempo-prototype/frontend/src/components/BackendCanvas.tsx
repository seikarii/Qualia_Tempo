/**
 * QUALIA.CODE v1.1 - BackendCanvas Component
 * Displays real-time rendered frames from backend moderngl engine.
 * Replaces DOM-based particle simulation with GPU-streamed visuals.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useService } from '../services/hooks';
import { TYPES } from '../services/inversify.types';
import type { IStreamingVideoService, VideoFrame, ConnectionStatus } from '../services/interfaces/IStreamingVideoService';
import type { ILogger } from '../services/interfaces/ILogger';

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
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const streamingService = useService<IStreamingVideoService>(TYPES.IStreamingVideoService);
  const logger = useService<ILogger>(TYPES.ILogger);
  
  // Component state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    state: 'DISCONNECTED',
    reconnectAttempts: 0
  });
  const [lastFrame, setLastFrame] = useState<VideoFrame | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

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
    const ctx = canvas.getContext('2d', {
      alpha: true, // CRITICAL: Enable transparency for atmosphere visibility
      desynchronized: true // Allow asynchronous rendering
    });

    if (!ctx) {
      logger.error('Failed to get 2D canvas context');
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
    ctx.imageSmoothingQuality = 'high';
    
    // QUALIA.CODE v1.1 COMPLIANCE: Canvas remains transparent for atmosphere visibility
    // Backend engine will provide content; no black background needed
    
    setIsCanvasReady(true);
    logger.info('BackendCanvas initialized', {
      width: canvasWidth,
      height: canvasHeight,
      quality
    });
  }, [canvasWidth, canvasHeight, quality, logger]);

  /**
   * Handle incoming video frames from streaming service
   */
  const handleVideoFrame = useCallback((frame: VideoFrame) => {
    const ctx = contextRef.current;
    if (!ctx || !isCanvasReady) return;

    try {
      // Create image from base64 data
      const img = new Image();
      
      img.onload = () => {
        // CRITICAL: Clear canvas for frame-to-frame transparency
        const canvas = canvasRef.current;
        if (canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw frame to canvas (scaled to fit)
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        // Update frame tracking
        setLastFrame(frame);
        setFrameCount(prev => prev + 1);
      };
      
      img.onerror = () => {
        logger.error('Failed to load video frame image');
      };
      
      // Set image source (base64 JPEG)
      img.src = `data:image/jpeg;base64,${frame.data}`;
      
    } catch (error) {
      logger.error('Error handling video frame', { error });
    }
  }, [isCanvasReady, canvasWidth, canvasHeight, logger]);

  /**
   * Update connection status from streaming service
   */
  const updateConnectionStatus = useCallback(() => {
    const status = streamingService.getConnectionStatus();
    setConnectionStatus(status);
  }, [streamingService]);

  // Initialize canvas on mount
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  // Setup streaming service and frame subscription
  useEffect(() => {
    let frameSubscriptionId: string | null = null;
    let statusInterval: NodeJS.Timeout | null = null;

    const setupStreaming = async () => {
      try {
        // Subscribe to video frames
        frameSubscriptionId = streamingService.subscribeToFrames(handleVideoFrame);
        
        // Setup status monitoring
        statusInterval = setInterval(updateConnectionStatus, 1000);
        
        // Connect to stream (don't fail if connection fails)
        try {
          await streamingService.connect();
          logger.info('BackendCanvas connected to video stream');
        } catch (error) {
          logger.warn('BackendCanvas failed to connect to video stream - continuing in offline mode', { error });
        }
        
      } catch (error) {
        logger.error('Failed to setup video streaming', { error });
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

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height, initializeCanvas]);

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Main canvas for backend-rendered frames */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          imageRendering: 'crisp-edges' // Sharp pixel rendering
          // QUALIA.CODE v1.1 COMPLIANCE: Removed backgroundColor for atmosphere visibility
        }}
        aria-label="Qualia Tempo Visual Effects Canvas"
      />
      
      {/* Connection status overlay (optional) */}
      {showStatus && (
        <div className="absolute top-4 left-4 z-50 bg-black bg-opacity-75 text-white p-2 rounded text-sm font-mono">
          <div className={`flex items-center gap-2 ${
            connectionStatus.connected ? 'text-green-400' : 'text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus.connected ? 'bg-green-400' : 'bg-red-400'
            }`} />
            {connectionStatus.state.toUpperCase()}
          </div>
          
          {connectionStatus.connected && lastFrame && (
            <>
              <div className="text-cyan-400">
                Frames: {frameCount}
              </div>
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
          
          {!connectionStatus.connected && connectionStatus.reconnectAttempts > 0 && (
            <div className="text-yellow-400">
              Reconnecting... ({connectionStatus.reconnectAttempts})
            </div>
          )}
          
          {connectionStatus.lastError && (
            <div className="text-red-400 text-xs mt-1">
              {connectionStatus.lastError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BackendCanvas;