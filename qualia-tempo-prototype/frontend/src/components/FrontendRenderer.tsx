/**
 * QUALIA.CODE v1.1 - FrontendRenderer Component
 * Three.js-based real-time visualization component for Qualia Tempo.
 * Renders particle effects based on streamed QualiaState data.
 */

import React, { useEffect, useRef, useState } from "react";
import { useFrontendRenderingService, useStateStreamingService, useLogger } from "../services/hooks";

interface FrontendRendererProps {
  /** Canvas width (default: full viewport) */
  width?: number;
  /** Canvas height (default: full viewport) */
  height?: number;
  /** CSS class name for styling */
  className?: string;
}

/**
 * FrontendRenderer - The definitive visual renderer for Qualia Tempo.
 *
 * This component represents the architectural shift from backend-rendered frames
 * to client-side GPU-accelerated rendering. It receives QualiaState updates via
 * WebSocket and renders dynamic particle effects using Three.js.
 *
 * Key Features:
 * - Three.js WebGL rendering
 * - Real-time QualiaState visualization
 * - Automatic WebSocket state streaming
 * - Performance monitoring
 * - Responsive canvas sizing
 */
const FrontendRenderer: React.FC<FrontendRendererProps> = ({
  width,
  height,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderingService = useFrontendRenderingService();
  const streamingService = useStateStreamingService();
  const logger = useLogger();

  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR">("IDLE");

  // Initialize rendering service and connect to state stream
  useEffect(() => {
    const initialized = useRef(false);

    const initializeRenderer = async () => {
      if (initialized.current) return;
      initialized.current = true;

      if (!canvasRef.current) return;

      try {
        // Initialize Three.js renderer
        await renderingService.initialize(canvasRef.current);
        setIsInitialized(true);

        // Start rendering
        renderingService.start();

        // Connect to state streaming
        await streamingService.connect();

        logger.info("FrontendRenderer initialized and connected to state stream");
      } catch (error) {
        logger.error("Failed to initialize FrontendRenderer", { error });
      }
    };

    initializeRenderer();

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        renderingService.resize(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderingService.stop();
      streamingService.disconnect();
    };
  }, [renderingService, streamingService, logger]);

  // Monitor connection status
  useEffect(() => {
    const status = streamingService.getConnectionStatus();
    setConnectionStatus(status.state);
  }, [streamingService]);

  // Handle canvas sizing
  useEffect(() => {
    if (canvasRef.current && isInitialized) {
      const rect = canvasRef.current.getBoundingClientRect();
      renderingService.resize(rect.width, rect.height);
    }
  }, [width, height, isInitialized, renderingService]);

  return (
    <div className={`frontend-renderer ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: width || '100%',
          height: height || '100%',
          display: 'block',
          background: '#000000',
        }}
      />

      {/* Connection status overlay */}
      {connectionStatus !== "CONNECTED" && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 12px',
            background: connectionStatus === "ERROR" ? '#ff4444' : '#444444',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          {connectionStatus === "CONNECTING" && "Connecting..."}
          {connectionStatus === "DISCONNECTED" && "Disconnected"}
          {connectionStatus === "ERROR" && "Connection Error"}
          {connectionStatus === "IDLE" && "Idle"}
        </div>
      )}

      {/* Performance stats overlay (debug mode) */}
      {process.env.NODE_ENV === 'development' && isInitialized && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}
        >
          {(() => {
            const stats = renderingService.getStats();
            return `FPS: ${stats.fps.toFixed(1)} | Triangles: ${stats.triangles} | Draw Calls: ${stats.drawCalls}`;
          })()}
        </div>
      )}
    </div>
  );
};

export default FrontendRenderer;