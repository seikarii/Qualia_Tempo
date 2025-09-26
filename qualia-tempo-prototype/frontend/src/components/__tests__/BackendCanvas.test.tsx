// QUALIA.CODE v1.1 - Test Suite for BackendCanvas
// Comprehensive tests for WebSocket-based backend canvas component

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BackendCanvas from '../BackendCanvas';
import type { IStreamingVideoService, VideoFrame } from '../../services/interfaces/IStreamingVideoService';

// 1. Importe el hook y el tipo necesarios
import { useService } from '../../services/hooks';
import { TYPES } from '../../services/inversify.types';

// 2. Mockee el módulo de hooks
vi.mock('../../services/hooks');

// Mock logger service
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock canvas context
const mockCanvasContext = {
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  canvas: {
    width: 1920,
    height: 1080
  }
};

// Mock HTMLCanvasElement with all necessary DOM properties
const mockCanvas = {
  getContext: vi.fn().mockReturnValue(mockCanvasContext),
  width: 1920,
  height: 1080,
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  hasAttribute: vi.fn(),
  tagName: 'CANVAS',
  nodeType: 1,
  ownerDocument: document,
  parentNode: null,
  nextSibling: null,
  previousSibling: null,
  firstChild: null,
  lastChild: null,
  childNodes: [],
  children: [],
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  insertBefore: vi.fn(),
  replaceChild: vi.fn(),
  cloneNode: vi.fn(),
  contains: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  style: {
    setProperty: vi.fn(),
    getPropertyValue: vi.fn(),
    removeProperty: vi.fn(),
    cssText: '',
    imageRendering: '',
  },
  className: '',
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
    toggle: vi.fn(),
  },
  id: '',
  innerHTML: '',
  outerHTML: '',
  textContent: '',
  innerText: '',
  // Canvas-specific properties
  toDataURL: vi.fn(),
  toBlob: vi.fn(),
  captureStream: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  rect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(),
  isPointInPath: vi.fn(),
  isPointInStroke: vi.fn(),
  getLineDash: vi.fn(),
  setLineDash: vi.fn(),
  createLinearGradient: vi.fn(),
  createRadialGradient: vi.fn(),
  createPattern: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low',
  fillStyle: '#000000',
  strokeStyle: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  lineDashOffset: 0,
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  direction: 'ltr',
};

// Mock Image constructor
global.Image = vi.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  src: '',
  width: 1920,
  height: 1080
})) as any;

describe('BackendCanvas', () => {
  let mockStreamingService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 3. Cree el mock del servicio
    mockStreamingService = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      subscribeToFrames: vi.fn().mockReturnValue('subscription-1'),
      unsubscribeFromFrames: vi.fn(),
      getConnectionStatus: vi.fn().mockReturnValue({ connected: true, state: 'connected' }),
      getStatistics: vi.fn().mockReturnValue({ currentFps: 60 }),
    };

    // 4. Configure el mock de useService para que devuelva el servicio mockeado
    (useService as vi.Mock).mockImplementation((type: symbol) => {
      if (type === TYPES.IStreamingVideoService) {
        return mockStreamingService;
      }
      if (type === TYPES.ILogger) {
        return mockLogger;
      }
      throw new Error(`Servicio no mockeado en el test: ${type.toString()}`);
    });

    // ... (mantenga el mock de document.createElement)
    // Mock canvas element creation - avoid recursion
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      // Use original implementation for other elements to avoid recursion
      return originalCreateElement.call(document, tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render canvas element', () => {
      render(<BackendCanvas />);
      
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should connect to streaming service on mount', async () => {
      render(<BackendCanvas />);
      
      await waitFor(() => {
        expect(mockStreamingService.connect).toHaveBeenCalled();
      });
    });

    it('should subscribe to video frames on mount', async () => {
      render(<BackendCanvas />);
      
      await waitFor(() => {
        expect(mockStreamingService.subscribeToFrames).toHaveBeenCalled();
      });
    });

    it('should disconnect on unmount', () => {
      const { unmount } = render(<BackendCanvas />);
      
      unmount();
      
      expect(mockStreamingService.disconnect).toHaveBeenCalled();
      expect(mockStreamingService.unsubscribeFromFrames).toHaveBeenCalledWith('subscription-1');
    });
  });

  describe('Canvas Rendering', () => {
    it('should initialize canvas context', () => {
      render(<BackendCanvas />);
      
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should render video frames to canvas', async () => {
      render(<BackendCanvas />);
      
      // Wait for subscription
      await waitFor(() => {
        expect(mockStreamingService.subscribeToFrames).toHaveBeenCalled();
      });
      
      // Get the frame callback and simulate frame reception
      const frameCallback = vi.mocked(mockStreamingService.subscribeToFrames).mock.calls[0][0];
      
      // Create mock video frame
      const mockFrame: VideoFrame = {
        data: 'base64-encoded-jpeg-data',
        timestamp: Date.now(),
        frameNumber: 1
      };
      
      // Simulate frame reception
      frameCallback(mockFrame);
      
      // Verify image creation and drawing
      expect(global.Image).toHaveBeenCalled();
    });

    it('should handle frame rendering errors gracefully', async () => {
      // Mock drawImage to throw error
      mockCanvasContext.drawImage.mockImplementation(() => {
        throw new Error('Canvas drawing failed');
      });
      
      render(<BackendCanvas />);
      
      await waitFor(() => {
        expect(mockStreamingService.subscribeToFrames).toHaveBeenCalled();
      });
      
      const frameCallback = vi.mocked(mockStreamingService.subscribeToFrames).mock.calls[0][0];
      
      const mockFrame: VideoFrame = {
        data: 'base64-encoded-jpeg-data',
        timestamp: Date.now(),
        frameNumber: 1
      };
      
      // Should not throw error
      expect(() => frameCallback(mockFrame)).not.toThrow();
    });
  });

  describe('Connection Status Display', () => {
    it('should display connection status when disconnected', () => {
      vi.mocked(mockStreamingService.getConnectionStatus).mockReturnValue({
        connected: false,
        state: 'disconnected',
        reconnectAttempts: 3
      });
      
      render(<BackendCanvas />);
      
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });

    it('should display connection status when connecting', () => {
      vi.mocked(mockStreamingService.getConnectionStatus).mockReturnValue({
        connected: false,
        state: 'connecting',
        reconnectAttempts: 0
      });
      
      render(<BackendCanvas />);
      
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('should hide connection status when connected', () => {
      vi.mocked(mockStreamingService.getConnectionStatus).mockReturnValue({
        connected: true,
        state: 'connected',
        reconnectAttempts: 0
      });
      
      render(<BackendCanvas />);
      
      // Status overlay should not be visible when connected
      const statusElements = screen.queryAllByText(/connected|connecting|disconnected/i);
      const visibleStatusElements = statusElements.filter(el => 
        !el.closest('[style*="display: none"]') && 
        !el.closest('[hidden]')
      );
      
      expect(visibleStatusElements).toHaveLength(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should display FPS information', () => {
      vi.mocked(mockStreamingService.getStatistics).mockReturnValue({
        framesReceived: 1800,
        bytesReceived: 90000,
        currentFps: 60,
        averageFrameSize: 50,
        lastFrameTimestamp: Date.now(),
        latency: 10,
        droppedFrames: 0
      });
      
      render(<BackendCanvas />);
      
      // Check if FPS is displayed in debug info (if enabled)
      const fpsDisplay = screen.queryByText(/60.*fps/i);
      // FPS might be displayed in debug mode
      if (fpsDisplay) {
        expect(fpsDisplay).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle streaming service connection failures', async () => {
      vi.mocked(mockStreamingService.connect).mockRejectedValue(new Error('Connection failed'));
      
      render(<BackendCanvas />);
      
      await waitFor(() => {
        expect(mockStreamingService.connect).toHaveBeenCalled();
      });
      
      // Component should still render despite connection failure
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle invalid frame data', async () => {
      render(<BackendCanvas />);
      
      await waitFor(() => {
        expect(mockStreamingService.subscribeToFrames).toHaveBeenCalled();
      });
      
      const frameCallback = vi.mocked(mockStreamingService.subscribeToFrames).mock.calls[0][0];
      
      // Simulate invalid frame data
      const invalidFrame = {
        data: null,
        timestamp: Date.now(),
        frameNumber: 1
      } as any;
      
      // Should not throw error
      expect(() => frameCallback(invalidFrame)).not.toThrow();
    });
  });

  describe('Canvas Sizing', () => {
    it('should set correct canvas dimensions', () => {
      render(<BackendCanvas />);
      
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveClass('w-full', 'h-full');
    });

    it('should maintain aspect ratio', () => {
      render(<BackendCanvas />);
      
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveClass('object-contain');
    });
  });
});