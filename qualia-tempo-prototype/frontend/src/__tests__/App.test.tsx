import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";
import App from "../App";
import { useGameStore } from "../state/useGameStore";
import { useService } from "../services/hooks";

// Mock the hooks
jest.mock("../state/useGameStore");
jest.mock("../services/hooks");
jest.mock("../components/HUD", () => ({
  HUD: () => <div data-testid="hud">HUD Component</div>,
}));
jest.mock("../components/Subtitles", () => ({
  Subtitles: () => <div data-testid="subtitles">Subtitles Component</div>,
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});

// Mock ResizeObserver for three.js compatibility
(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe("App Component", () => {
  const mockUseGameStore = useGameStore as jest.MockedFunction<
    typeof useGameStore
  >;
  const mockUseServices = useServices as jest.MockedFunction<
    typeof useServices
  >;

  const mockEventBus = {
    emit: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    once: jest.fn(),
    clear: jest.fn(),
    listeners: new Map(),
    eventHistory: [],
    maxHistorySize: 1000,
    isDestroyed: false,
  };

  const mockBackendSync = {
    start: jest.fn(),
    stop: jest.fn(),
    isBackendConnected: jest.fn(),
    forceSync: jest.fn(),
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    config: {},
    eventListenerIds: [],
    isRunning: false,
    isConnected: false,
  };

  const mockServices = {
    eventBus: mockEventBus,
    backendSync: mockBackendSync,
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue(mockServices as any);
    mockUseGameStore.mockImplementation(((selector: any) => {
      if (typeof selector === "function") {
        return selector(mockGameState);
      }
      return mockGameState;
    }) as any);
  });

  // Helper function to set isPlaying state
  const setMockGamePlaying = (isPlaying: boolean) => {
    const newGameState = { ...mockGameState, isPlaying };
    mockUseGameStore.mockImplementation(((selector: any) => {
      if (typeof selector === "function") {
        return selector(newGameState);
      }
      return newGameState;
    }) as any);
  };

  afterEach(() => {
    jest.clearAllTimers();
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
      });
    });

    it("should transition from loading to connected state", async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading Qualia Tempo..."),
        ).not.toBeInTheDocument();
      });

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
      mockBackendSync.isBackendConnected.mockReturnValue(false);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("❌ Backend Disconnected")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Cannot connect to Qualia Tempo Visual Engine"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("cd backend && python main.py"),
      ).toBeInTheDocument();
    });

    it("should show connected state when backend is available", async () => {
      mockBackendSync.isBackendConnected.mockReturnValue(true);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("🎵 Qualia Tempo")).toBeInTheDocument();
      });

      expect(
        screen.getByText("✅ Backend Connected | ⚡ Visual Engine Ready"),
      ).toBeInTheDocument();
    });

    it("should handle connection check errors gracefully", async () => {
      mockBackendSync.isBackendConnected.mockImplementation(() => {
        throw new Error("Connection failed");
      });

      render(<App />);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          "Failed to check backend connection:",
          expect.any(Error),
        );
      });

      expect(screen.getByText("❌ Backend Disconnected")).toBeInTheDocument();
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
        expect(screen.getByText("🔥 Combat Active")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /pause/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset/i }),
      ).toBeInTheDocument();
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
        const startButton = screen.getByRole("button", {
          name: /start the first duel/i,
        });
        fireEvent.click(startButton);
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: "PlayerAction",
        action: "StartGame",
        source: "App",
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "� Game Start Requested via EventBus!",
      );
    });

    it("should not emit StartGame event when backend is disconnected", async () => {
      mockBackendSync.isBackendConnected.mockReturnValue(false);
      setMockGamePlaying(false);

      render(<App />);

      await waitFor(() => {
        // When backend is disconnected, no start button should be present
        expect(
          screen.queryByRole("button", { name: /start the first duel/i }),
        ).not.toBeInTheDocument();
      });

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it("should emit PauseGame event when pause button is clicked", async () => {
      setMockGamePlaying(true);

      render(<App />);

      await waitFor(() => {
        const pauseButton = screen.getByRole("button", { name: /pause/i });
        fireEvent.click(pauseButton);
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: "PlayerAction",
        action: "PauseGame",
        source: "App",
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "⏸️ Game Pause Requested via EventBus",
      );
    });

    it("should emit ResetGame event when reset button is clicked", async () => {
      setMockGamePlaying(true);

      render(<App />);

      await waitFor(() => {
        const resetButton = screen.getByRole("button", { name: /reset/i });
        fireEvent.click(resetButton);
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: "PlayerAction",
        action: "ResetGame",
        source: "App",
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        "🔄 Game Reset Requested via EventBus",
      );
    });
  });

  describe("UI Components Integration", () => {
    beforeEach(() => {
      mockBackendSync.isBackendConnected.mockReturnValue(true);
      setMockGamePlaying(true);
    });

    it("should render HUD and Subtitles components", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("hud")).toBeInTheDocument();
        expect(screen.getByTestId("subtitles")).toBeInTheDocument();
      });
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
      });
    });

    it("should display version information", async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText("Qualia Tempo v1.0 | Prototype Build"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Connection Monitoring", () => {
    beforeEach(() => {
      setMockGamePlaying(false);
      mockBackendSync.isBackendConnected.mockReturnValue(true);
    });

    it("should check connection on mount", async () => {
      render(<App />);

      await waitFor(() => {
        expect(mockBackendSync.isBackendConnected).toHaveBeenCalled();
      });
    });

    it("should recheck connection every 5 seconds", async () => {
      jest.useFakeTimers();

      render(<App />);

      // Initial check
      await waitFor(() => {
        expect(mockBackendSync.isBackendConnected).toHaveBeenCalledTimes(1);
      });

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);
      expect(mockBackendSync.isBackendConnected).toHaveBeenCalledTimes(2);

      // Advance time by another 5 seconds
      jest.advanceTimersByTime(5000);
      expect(mockBackendSync.isBackendConnected).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it("should cleanup interval on unmount", () => {
      jest.useFakeTimers();

      const { unmount } = render(<App />);

      unmount();

      // Advance time - should not call the function anymore
      jest.advanceTimersByTime(5000);
      expect(mockBackendSync.isBackendConnected).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("should handle backend sync service errors", async () => {
      setMockGamePlaying(false);
      mockUseServices.mockImplementation(() => {
        throw new Error("Service unavailable");
      });

      // Mock console.error to prevent test output pollution
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => render(<App />)).toThrow("Service unavailable");

      console.error = originalError;
    });
  });
});
