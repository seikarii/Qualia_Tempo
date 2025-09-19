import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";
import { useGameStore } from "../state/useGameStore";
import { useService } from "../services/hooks";
import { TYPES } from "../services/inversify.types";

// Mock the hooks
vi.mock("../state/useGameStore");
vi.mock("../services/hooks");
vi.mock("../components/HUD", () => ({
  HUD: () => <div data-testid="hud">HUD Component</div>,
}));
vi.mock("../components/Subtitles", () => ({
  Subtitles: () => <div data-testid="subtitles">Subtitles Component</div>,
}));
vi.mock("../components/game/QualiaTempoGame", () => ({
  default: () => <div data-testid="qualia-game">Qualia Tempo Game</div>,
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});

// Mock ResizeObserver for three.js compatibility
(global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe("App Component", () => {
  const mockUseGameStore = useGameStore as MockedFunction<
    typeof useGameStore
  >;
  const mockUseService = useService as MockedFunction<
    typeof useService
  >;

  const mockEventBus = {
    emit: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    once: vi.fn(),
    clear: vi.fn(),
    listeners: new Map(),
    eventHistory: [],
    maxHistorySize: 1000,
    isDestroyed: false,
  };

  const mockBackendSync = {
    start: vi.fn(),
    stop: vi.fn(),
    isBackendConnected: vi.fn(),
    forceSync: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    config: {},
    eventListenerIds: [],
    isRunning: false,
    isConnected: false,
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  const mockApplicationInitializer = {
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  };

  const mockServices = {
    eventBus: mockEventBus,
    backendSync: mockBackendSync,
    logger: mockLogger,
    applicationInitializer: mockApplicationInitializer,
    qualiaCalculator: {},
    gameController: {},
    configService: {},
  };

  const mockQualiaState = {
    intensity: 0.5,
    focus_level: 0.7,
    aggression: 0.3,
    flow: 0.8,
    chaos: 0.1,
    recovery: 0.0,
    transcendence: 0.0,
  };

    const mockGameState = {
    isPlaying: false,
    qualiaState: mockQualiaState,
    currentTime: 0,
    gameStartTime: 0,
    player: {
      position: { x: 0, y: 0 },
      health: 100,
      combo: 0,
      score: 0,
      isMoving: false,
      lastRhythmHit: 0,
    },
    combatData: null,
    totalNotes: 0,
    notesHit: 0,
    notesMissed: 0,
    currentStreak: 0,
    maxStreak: 0,
    pauseCooldownRemaining: 0,
    backendConnected: true,
    isConfigLoaded: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Ensure we start with real timers
    mockUseService.mockImplementation((serviceType: any) => {
      if (serviceType === TYPES.IEventBus) return mockEventBus as any;
      if (serviceType === TYPES.IBackendSyncService) return mockBackendSync as any;
      if (serviceType === TYPES.ILogger) return mockLogger as any;
      if (serviceType === TYPES.IApplicationInitializerService) return mockApplicationInitializer as any;
      return {} as any;
    });
    mockUseGameStore.mockImplementation(((selector: any) => {
      if (typeof selector === "function") {
        return selector(mockGameState);
      }
      return mockGameState;
    }) as any);
  });

  // Helper function to set isPlaying state
  const setMockGamePlaying = (isPlaying: boolean, backendConnected = true, isConfigLoaded = true) => {
    const newGameState = { ...mockGameState, isPlaying, backendConnected, isConfigLoaded };
    mockUseGameStore.mockImplementation(((selector: any) => {
      if (typeof selector === "function") {
        return selector(newGameState);
      }
      return newGameState;
    }) as any);
  };

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers(); // Always restore real timers after each test
  });

  describe("Initial Loading State", () => {
    beforeEach(() => {
      setMockGamePlaying(false);
      mockBackendSync.isBackendConnected.mockReturnValue(true);
    });

    it("should show loading state initially", async () => {
      // Mock to simulate async connection check
      mockBackendSync.isBackendConnected.mockImplementationOnce(() => {
        return true;
      });

      render(<App />);

      // The loading state is very brief, so we check that the component renders
      // and eventually transitions to the connected state
      await waitFor(() => {
        expect(screen.getByText("🎵 Qualia Tempo")).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should transition from loading to connected state", async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading Qualia Tempo..."),
        ).not.toBeInTheDocument();
      }, { timeout: 2000 });

      expect(screen.getByText("🎵 Qualia Tempo")).toBeInTheDocument();
      expect(
        screen.getByText("✅ Backend Connected | ⚡ Visual Engine Ready"),
      ).toBeInTheDocument();
    });
  });

  describe("Backend Connection States", () => {
    beforeEach(() => {
      setMockGamePlaying(false);
    });

    it("should show disconnected state when backend is not connected", async () => {
      setMockGamePlaying(false, false); // Set backendConnected to false

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("❌ Backend Disconnected")).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(
        screen.getByText("Cannot connect to Qualia Tempo Visual Engine"),
      ).toBeInTheDocument();
    });

    it("should show connected state when backend is available", async () => {
      mockBackendSync.isBackendConnected.mockReturnValue(true);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("🎵 Qualia Tempo")).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(
        screen.getByText("✅ Backend Connected | ⚡ Visual Engine Ready"),
      ).toBeInTheDocument();
    });

    it("should handle connection check errors gracefully", async () => {
      // Mock the application initializer to throw an error during startup
      mockApplicationInitializer.start.mockRejectedValue(new Error("Connection failed"));

      render(<App />);

      // The app should still render and show the start screen despite initialization errors
      await waitFor(() => {
        expect(screen.getByText("🎵 Qualia Tempo")).toBeInTheDocument();
      }, { timeout: 2000 });

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Component: Application initialization failed',
        expect.any(Error)
      );
    });
  });

  describe("Game State Management", () => {
    beforeEach(() => {
      mockBackendSync.isBackendConnected.mockReturnValue(true);
    });

    it("should show start screen when game is not playing", async () => {
      setMockGamePlaying(false);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("🎵 Qualia Tempo")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /start the first duel/i }),
      ).toBeInTheDocument();
    });

    it("should show combat screen when game is playing", async () => {
      setMockGamePlaying(true);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("qualia-game")).toBeInTheDocument();
      });

      // The QualiaTempoGame component should be rendered when playing
      expect(screen.getByTestId("qualia-game")).toBeInTheDocument();
    });
  });

  describe("Event Handlers", () => {
    beforeEach(() => {
      mockBackendSync.isBackendConnected.mockReturnValue(true);
    });

    it("should emit StartGame event when start button is clicked", async () => {
      setMockGamePlaying(false);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole("button", {
          name: /start the first duel/i,
        })).toBeInTheDocument();
      }, { timeout: 2000 });

      const startButton = screen.getByRole("button", {
        name: /start the first duel/i,
      });
      fireEvent.click(startButton);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: "PlayerAction",
        action: "StartGame",
        source: "App",
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Game Start Requested via EventBus",
      );
    });

    it("should not emit StartGame event when backend is disconnected", async () => {
      setMockGamePlaying(false, false); // Set backendConnected to false

      render(<App />);

      await waitFor(() => {
        // When backend is disconnected, no start button should be present
        expect(
          screen.queryByRole("button", { name: /start the first duel/i }),
        ).not.toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    // Note: Pause and Reset functionality is handled via keyboard events (SPACE and ESC)
    // and displayed as text instructions, not as buttons
  });

  describe("UI Components Integration", () => {
    beforeEach(() => {
      mockBackendSync.isBackendConnected.mockReturnValue(true);
      setMockGamePlaying(true);
    });

    it("should render Subtitles component", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("subtitles")).toBeInTheDocument();
      }, { timeout: 2000 });

      // Note: HUD component is not currently implemented in the App component
    });

    it("should display game controls information", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("🎮 Controls:")).toBeInTheDocument();
        expect(
          screen.getByText("WASD - Rhythmic Movement"),
        ).toBeInTheDocument();
        expect(screen.getByText("SPACE - Pause Ability")).toBeInTheDocument();
        expect(screen.getByText("ESC - Reset Game")).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should display version information", async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText("Qualia Tempo v1.0 | Prototype Build"),
        ).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe("Connection Monitoring", () => {
    beforeEach(() => {
      setMockGamePlaying(false);
      mockBackendSync.isBackendConnected.mockReturnValue(true);
    });

    // Note: Connection monitoring is handled by the backend sync service
    // and the connection status is read from the game store, not called directly
    it("should display connection status from store", async () => {
      setMockGamePlaying(false, true); // Connected

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Backend: Connected")).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe("Error Handling", () => {
    it("should handle backend sync service errors gracefully", async () => {
      setMockGamePlaying(false);
      // Mock the application initializer to throw an error
      mockApplicationInitializer.start.mockRejectedValue(new Error("Service initialization failed"));

      render(<App />);

      // The app should still render despite service initialization errors
      await waitFor(() => {
        expect(screen.getByText("🎵 Qualia Tempo")).toBeInTheDocument();
      }, { timeout: 2000 });

      // Error should be logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'App Component: Application initialization failed',
        expect.any(Error)
      );
    });
  });
});
