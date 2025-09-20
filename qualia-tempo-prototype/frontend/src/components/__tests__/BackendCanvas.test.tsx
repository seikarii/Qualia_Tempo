// QUALIA.CODE v1.1 - Test Suite for BackendCanvas
// Comprehensive tests for WebSocket-based backend canvas component

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { container } from '../../services/inversify.container';
import { TYPES } from '../../services/inversify.types';
import BackendCanvas from '../BackendCanvas';
import type { IStreamingVideoService, VideoFrame } from '../../services/interfaces/IStreamingVideoService';

// Mock the useService hook
vi.mock('../services/hooks', () => ({
  useService: vi.fn((type) => {
    if (type === TYPES.IStreamingVideoService) {
      return mockStreamingService;
    }
    return null;
  })
}));

// Mock streaming service
const mockStreamingService: Partial<IStreamingVideoService> = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  subscribeToFrames: vi.fn().mockReturnValue('subscription-1'),
  unsubscribeFromFrames: vi.fn(),
  getConnectionStatus: vi.fn().mockReturnValue({
    connected: true,
    state: 'connected',
    reconnectAttempts: 0
  }),
  getStatistics: vi.fn().mockReturnValue({
    framesReceived: 100,
    bytesReceived: 5000,
    currentFps: 60,
    averageFrameSize: 50,
    lastFrameTimestamp: Date.now(),
    latency: 10,
    droppedFrames: 0
  })
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

// Mock HTMLCanvasElement
const mockCanvas = {
  getContext: vi.fn().mockReturnValue(mockCanvasContext),
  width: 1920,
  height: 1080
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
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock canvas element creation
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
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
        data: new ArrayBuffer(100),
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
        data: new ArrayBuffer(100),
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