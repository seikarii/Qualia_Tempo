/**
 * QUALIA.CODE v1.1 - FrontendRenderer Component
 * Three.js-based real-time visualization component for Qualia Tempo.
 * Renders particle effects based on streamed QualiaState data.
 */

import React, { useEffect, useRef, useState } from "react";
import { useFrontendRenderingService, useStateStreamingService, useLogger } from "../services/hooks";
import type { ConnectionStateType } from "../services/contracts/events.contracts";
import type { IFrontendRenderingService } from "../services/interfaces/IFrontendRenderingService";

interface FrontendRendererProps {
  /** Canvas width (default: full viewport) */
  width?: number;
  /** Canvas height (default: full viewport) */
  height?: number;
  /** CSS class name for styling */
  className?: string;
}

interface ConnectionStatusOverlayProps {
  connectionStatus: ConnectionStateType;
}

interface PerformanceStatsOverlayProps {
  isInitialized: boolean;
  renderingService: IFrontendRenderingService;
}

/**
 * Connection status overlay component
 */
const ConnectionStatusOverlay: React.FC<ConnectionStatusOverlayProps> = ({ connectionStatus }) => {
  if (connectionStatus === "CONNECTED") return null;

  const getStatusColor = () => connectionStatus === "ERROR" ? '#ff4444' : '#444444';
  const getStatusText = () => {
    switch (connectionStatus) {
      case "CONNECTING": return "Connecting...";
      case "RECONNECTING": return "Reconnecting...";
      case "DISCONNECTED": return "Disconnected";
      case "ERROR": return "Connection Error";
      case "IDLE": return "Idle";
      default: return "Unknown";
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        background: getStatusColor(),
        color: 'white',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      {getStatusText()}
    </div>
  );
};

/**
 * Performance stats overlay component
 */
const PerformanceStatsOverlay: React.FC<PerformanceStatsOverlayProps> = ({ isInitialized, renderingService }) => {
  if (process.env.NODE_ENV !== 'development' || !isInitialized) return null;

  const stats = renderingService.getStats();
  const statsText = `FPS: ${stats.fps.toFixed(1)} | Triangles: ${stats.triangles} | Draw Calls: ${stats.drawCalls}`;

  return (
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
      {statsText}
    </div>
  );
};

/**
 * Custom hook for renderer initialization logic
 */
const useRendererInitialization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializedRef = useRef(false);
  const renderingService = useFrontendRenderingService();
  const streamingService = useStateStreamingService();
  const logger = useLogger();

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeRenderer = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      if (!canvasRef.current) return;

      try {
        await renderingService.initializeRenderer(canvasRef.current);
        setIsInitialized(true);
        renderingService.start();
        await streamingService.connect();
        logger.info("FrontendRenderer initialized and connected to state stream");
      } catch (error) {
        logger.error("Failed to initialize FrontendRenderer", { error });
      }
    };

    initializeRenderer();

    return () => {
      renderingService.stop();
      streamingService.disconnect();
    };
  }, [renderingService, streamingService, logger]);

  return { canvasRef, isInitialized, renderingService };
};

/**
 * Custom hook for connection status monitoring
 */
const useConnectionStatus = () => {
  const streamingService = useStateStreamingService();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStateType>("IDLE");

  useEffect(() => {
    const status = streamingService.getConnectionStatus();
    setConnectionStatus(status.state);
  }, [streamingService]);

  return connectionStatus;
};

/**
 * Custom hook for canvas sizing
 */
const useCanvasSizing = (isInitialized: boolean, width?: number, height?: number) => {
  const renderingService = useFrontendRenderingService();

  useEffect(() => {
    if (isInitialized) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        renderingService.resize(rect.width, rect.height);
      }
    }
  }, [width, height, isInitialized, renderingService]);
};

/**
 * Custom hook for FrontendRenderer business logic
 * Handles initialization, connection status, and canvas sizing
 */
const useFrontendRenderer = (width?: number, height?: number) => {
  const { canvasRef, isInitialized, renderingService } = useRendererInitialization();
  const connectionStatus = useConnectionStatus();
  useCanvasSizing(isInitialized, width, height);

  return {
    canvasRef,
    isInitialized,
    connectionStatus,
    renderingService,
  };
};

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
  const { canvasRef, isInitialized, connectionStatus, renderingService } = useFrontendRenderer(width, height);

  return (
    <div className={`frontend-renderer ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: width ?? '100%',
          height: height ?? '100%',
          display: 'block',
          background: '#000000',
        }}
      />

      <ConnectionStatusOverlay connectionStatus={connectionStatus} />
      <PerformanceStatsOverlay isInitialized={isInitialized} renderingService={renderingService} />
    </div>
  );
};

export default FrontendRenderer;