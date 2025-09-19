import { describe, test, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { render, screen } from "@testing-library/react";
import { HUD } from "../HUD";
import {
  useGameStore,
  useQualiaState,
  useGameStats,
} from "../../state/useGameStore";
import { useConfiguration } from "../../services/hooks";

// Mock the services hooks
vi.mock("../../services/hooks", () => ({
  useConfiguration: vi.fn(),
}));

// Mock the store hooks
vi.mock("../../state/useGameStore", () => ({
  useGameStore: vi.fn(),
  useQualiaState: vi.fn(),
  useGameStats: vi.fn(),
}));

// Mock services hooks
vi.mock("../../services/hooks", () => ({
  useConfiguration: vi.fn(),
}));

const mockUseConfiguration = vi.mocked(useConfiguration);
const mockUseGameStore = vi.mocked(useGameStore);
const mockUseQualiaState = vi.mocked(useQualiaState);
const mockUseGameStats = vi.mocked(useGameStats);

// Helper to create a mock store that handles selectors
const createMockStore = (state: any) => {
  return (selector?: (_state: any) => any) => {
    if (selector) {
      return selector(state);
    }
    return state;
  };
};

describe("HUD Component", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock configuration service
    mockUseConfiguration.mockReturnValue({
      loadConfig: vi.fn().mockResolvedValue(undefined),
      getConfig: vi.fn(() => ({})),
      getGameConfig: vi.fn(() => ({
        maxCombo: 100,
        scoreMultiplier: 1.0,
        timeLimit: 300,
      })),
      getQualiaConfig: vi.fn(() => ({
        baseQualiaState: {
          intensity: 0.5,
          focus_level: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.5,
        },
        performanceMultipliers: {
          perfectHit: 1.5,
          goodHit: 1.0,
          missHit: -0.5,
          comboBonus: 0.1,
        },
        decayRates: {
          intensity: 0.02,
          focus_level: 0.02,
          aggression: 0.02,
          flow: 0.02,
          chaos: 0.02,
          recovery: 0.02,
          transcendence: 0.02,
        },
        thresholds: {
          highIntensity: 0.8,
          lowPrecision: 0.3,
          chaosThreshold: 0.7,
          transcendenceThreshold: 0.9,
        },
        comboSystem: {
          maxComboMultiplier: 3.0,
          comboDecayTime: 1000,
          perfectComboBonus: 0.2,
        },
        recoveryMechanics: {
          recoveryRate: 0.05,
          maxRecovery: 1.0,
          recoveryCooldown: 2000,
        },
        updateIntervalMs: 16,
        historySize: 100,
        hitNoteMultipliers: { intensity: 0.1, focus_level: 0.1, flow: 0.1 },
        missNoteMultipliers: { chaos: 0.2, focus_level: -0.1, flow: -0.1 },
        dashMultipliers: { aggression: 0.15, intensity: 0.1 },
        fastForwardMultipliers: { aggression: 0.1, intensity: 0.05 },
        rewindMultipliers: { recovery: 0.1, focus_level: 0.05 },
        updateInterval: 16,
        intensityDecay: 0.02,
        focusDecay: 0.02,
        aggressionDecay: 0.02,
        flowDecay: 0.02,
        chaosDecay: 0.02,
        recoveryDecay: 0.02,
        transcendenceDecay: 0.02,
        transcendenceThresholds: { intensity: 0.8, focus_level: 0.8, flow: 0.8 },
        minValue: 0.0,
        maxValue: 1.0,
      })),
      getBackendConfig: vi.fn(() => ({
        api: {
          baseUrl: "http://localhost:8000",
          qualiaEndpoint: "/api/qualia",
          healthEndpoint: "/api/health",
          timeout: 5000,
        },
        sync: {
          throttleDelay: 250,
          batchSize: 10,
          maxRetries: 3,
          retryDelay: 1000,
        },
        connection: {
          healthCheckInterval: 10000,
          connectionTimeout: 5000,
          maxFailedAttempts: 3,
        },
        validation: {
          enableSchemaValidation: true,
          strictMode: false,
          logValidationErrors: true,
        },
        performance: {
          enableCompression: true,
          maxPayloadSize: 1048576,
          enableBuffering: true,
          bufferFlushInterval: 1000,
        },
        errorHandling: {
          enableCircuitBreaker: true,
          circuitBreakerThreshold: 5,
          circuitBreakerTimeout: 30000,
          enableFallbackMode: true,
        },
        messages: {
          backendNotConnected: "Backend not connected",
          serviceAlreadyRunning: "Service already running",
          serviceNotRunning: "Service not running",
          syncScheduled: "Sync scheduled",
          sendingQualiaState: "Sending qualia state",
          backendResponse: "Backend response",
          syncCompleted: "Sync completed",
          syncFailed: "Sync failed",
          healthCheck: "Health check",
          backendHealthy: "Backend healthy",
          backendUnhealthy: "Backend unhealthy",
          healthCheckFailed: "Health check failed",
          periodicHealthCheckFailed: "Periodic health check failed",
          serviceStarted: "Service started",
          serviceStopped: "Service stopped",
          startFailed: "Start failed",
          stopFailed: "Stop failed",
          updateConfig: "Update config",
          updateConfigFailed: "Update config failed",
          forceSync: "Force sync",
          forceSyncCompleted: "Force sync completed",
          forceSyncFailed: "Force sync failed",
          circuitBreakerOpen: "Circuit breaker open",
          circuitBreakerClosed: "Circuit breaker closed",
          fallbackMode: "Fallback mode",
          fallbackModeDisabled: "Fallback mode disabled",
          connectionRestored: "Connection restored",
          connectionLost: "Connection lost",
          retryAttempt: "Retry attempt",
          maxRetriesExceeded: "Max retries exceeded",
          throttleActive: "Throttle active",
          throttleInactive: "Throttle inactive",
        },
      })),
      getAudioConfig: vi.fn(() => ({} as any)),
      getErrorReportingConfig: vi.fn(() => ({} as any)),
      getRhythmicMovementConfig: vi.fn(() => ({} as any)),
      getNotificationConfig: vi.fn(() => ({} as any)),
      getConfigSection: vi.fn(() => ({} as any)),
      isLoaded: vi.fn(() => true),
      reload: vi.fn().mockResolvedValue(undefined),
    });

    // Default mock state
    const defaultState = {
      player: {
        position: { x: 0, y: 0 },
        health: 100,
        combo: 5,
        score: 12500,
        isMoving: false,
        lastRhythmHit: 0,
      },
      isPlaying: true,
      currentTime: 65,
      gameStartTime: Date.now() - 65000,
      combatData: null,
      qualiaState: {
        intensity: 0.8,
        focus_level: 0.9,
        aggression: 0.3,
        flow: 0.7,
        chaos: 0.1,
        recovery: 0.0,
        transcendence: 0.0,
      },
      totalNotes: 100,
      notesHit: 85,
      notesMissed: 15,
      currentStreak: 12,
      maxStreak: 25,
      pauseCooldownRemaining: 0,
    };

    mockUseGameStore.mockImplementation(createMockStore(defaultState));
    mockUseQualiaState.mockReturnValue(defaultState.qualiaState);
    mockUseGameStats.mockReturnValue({
      notesHit: 85,
      notesMissed: 15,
      accuracy: 85.0,
      currentStreak: 12,
      maxStreak: 25,
    });
  });

  test("renders game stats correctly", () => {
    render(<HUD />);

    expect(screen.getByText("Combo: 5")).toBeInTheDocument();
    expect(screen.getByText(/Score: 12[,.]500/)).toBeInTheDocument();
    expect(screen.getByText("Accuracy: 85.0%")).toBeInTheDocument();
    expect(screen.getByText("Streak: 12 (Best: 25)")).toBeInTheDocument();
  });

  test("displays paused state when not playing", () => {
    const pausedState = {
      player: {
        position: { x: 0, y: 0 },
        health: 100,
        combo: 0,
        score: 0,
        isMoving: false,
        lastRhythmHit: 0,
      },
      isPlaying: false,
      currentTime: 0,
      gameStartTime: Date.now(),
      combatData: null,
      qualiaState: {
        intensity: 0.0,
        focus_level: 0.0,
        aggression: 0.0,
        flow: 0.0,
        chaos: 0.0,
        recovery: 0.0,
        transcendence: 0.0,
      },
      totalNotes: 0,
      notesHit: 0,
      notesMissed: 0,
      currentStreak: 0,
      maxStreak: 0,
      pauseCooldownRemaining: 0,
    };

    mockUseGameStore.mockImplementation(createMockStore(pausedState));
    mockUseQualiaState.mockReturnValue(pausedState.qualiaState);
    mockUseGameStats.mockReturnValue({
      notesHit: 0,
      notesMissed: 0,
      accuracy: 0.0,
      currentStreak: 0,
      maxStreak: 0,
    });

    render(<HUD />);

    expect(screen.getByText("PAUSED")).toBeInTheDocument();
  });

  test("applies custom className", () => {
    const { container } = render(<HUD className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  test("formats time correctly for different values", () => {
    const timeState = {
      player: {
        position: { x: 0, y: 0 },
        health: 100,
        combo: 8,
        score: 25000,
        isMoving: false,
        lastRhythmHit: 0,
      },
      isPlaying: true,
      currentTime: 65,
      gameStartTime: Date.now() - 65000,
      combatData: null,
      qualiaState: {
        intensity: 0.6,
        focus_level: 0.8,
        aggression: 0.4,
        flow: 0.9,
        chaos: 0.2,
        recovery: 0.1,
        transcendence: 0.0,
      },
      totalNotes: 150,
      notesHit: 120,
      notesMissed: 30,
      currentStreak: 15,
      maxStreak: 30,
      pauseCooldownRemaining: 0,
    };

    mockUseGameStore.mockImplementation(createMockStore(timeState));
    mockUseQualiaState.mockReturnValue(timeState.qualiaState);
    mockUseGameStats.mockReturnValue({
      notesHit: 120,
      notesMissed: 30,
      accuracy: 80.0,
      currentStreak: 15,
      maxStreak: 30,
    });

    render(<HUD />);

    expect(screen.getByText("1:05")).toBeInTheDocument();
  });
});
