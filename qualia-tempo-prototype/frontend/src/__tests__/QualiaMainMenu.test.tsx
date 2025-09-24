import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import QualiaMainMenu from "../components/QualiaMainMenu";
import { useService } from "../services/hooks";
import { TYPES } from "../services/inversify.types";
import type { IEventBus } from "../services/interfaces/IEventBus";
import type { IConfigurationService } from "../services/interfaces/IConfigurationService";

// Mock the hooks
vi.mock("../services/hooks");

// Mock framer-motion to avoid animation complexities in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock services
const mockEventBus = {
  emit: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockReturnValue('listener-id'),
  unsubscribe: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  getStats: vi.fn().mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false,
  }),
};

const mockConfigService = {
  loadConfig: vi.fn(),
  getConfig: vi.fn().mockReturnValue({
    mainMenu: {
      particles: {
        generation_interval_ms: 800,
        colors: ['#22d3ee', '#a855f7', '#ec4899']
      },
      animations: {
        button_hover: { scale: 1.05 }
      }
    }
  }),
  getGameConfig: vi.fn(),
  getQualiaConfig: vi.fn(),
  getBackendConfig: vi.fn(),
  getAudioConfig: vi.fn(),
  getErrorReportingConfig: vi.fn(),
  getRhythmicMovementConfig: vi.fn(),
  getNotificationConfig: vi.fn(),
  getQualiaStateConfig: vi.fn(),
  isLoaded: vi.fn().mockReturnValue(true),
};

describe('QualiaMainMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the useService hook to return our mock services
    (useService as any).mockImplementation((type: symbol) => {
      if (type === TYPES.IEventBus) {
        return mockEventBus;
      }
      if (type === TYPES.IConfigurationService) {
        return mockConfigService;
      }
      throw new Error(`Unmocked service type: ${type.toString()}`);
    });
  });

  test('renders main menu with title and start button', () => {
    render(<QualiaMainMenu />);

    // Check for QUALIA and TEMPO separately since they're in separate spans
    expect(screen.getByText('QUALIA')).toBeTruthy();
    expect(screen.getByText('TEMPO')).toBeTruthy();
    expect(screen.getByText('INITIATE NEURAL SYNC')).toBeTruthy();
    expect(screen.getByText('CLICK ANYWHERE TO GENERATE QUALIA')).toBeTruthy();
  });

  test('loads configuration from ConfigurationService', () => {
    render(<QualiaMainMenu />);

    expect(mockConfigService.getConfig).toHaveBeenCalled();
  });

  test('emits StartGame event when start button is clicked', async () => {
    render(<QualiaMainMenu />);

    const startButton = screen.getByText('INITIATE NEURAL SYNC');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PlayerAction',
          action: 'StartGame',
          source: 'QualiaMainMenu'
        })
      );
    });
  });

  test('uses IoC container services instead of direct instantiation', () => {
    render(<QualiaMainMenu />);

    // Verify that services are resolved via useService hook
    expect(useService).toHaveBeenCalledWith(TYPES.IEventBus);
    expect(useService).toHaveBeenCalledWith(TYPES.IConfigurationService);
  });

  test('integrates with EventBus for game state management', async () => {
    render(<QualiaMainMenu />);

    const startButton = screen.getByText('INITIATE NEURAL SYNC');
    fireEvent.click(startButton);

    await waitFor(() => {
      const emittedEvent = mockEventBus.emit.mock.calls[0][0];
      expect(emittedEvent.type).toBe('PlayerAction');
      expect(emittedEvent.action).toBe('StartGame');
      expect(emittedEvent.source).toBe('QualiaMainMenu');
    });
  });

  test('respects QUALIA.CODE configuration externalization', () => {
    render(<QualiaMainMenu />);

    // Verify configuration is loaded from external source
    expect(mockConfigService.getConfig).toHaveBeenCalled();
    expect(mockConfigService.getConfig).toHaveBeenCalledTimes(1);
  });
});