import { render, screen } from "@testing-library/react";
import { HUD } from "../HUD";
import {
  useGameStore,
  useQualiaState,
  useGameStats,
} from "../../state/useGameStore";

// Mock the store hooks
jest.mock("../../state/useGameStore", () => ({
  useGameStore: jest.fn(),
  useQualiaState: jest.fn(),
  useGameStats: jest.fn(),
}));

const mockUseGameStore = useGameStore as jest.MockedFunction<
  typeof useGameStore
>;
const mockUseQualiaState = useQualiaState as jest.MockedFunction<
  typeof useQualiaState
>;
const mockUseGameStats = useGameStats as jest.MockedFunction<
  typeof useGameStats
>;

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
    jest.clearAllMocks();

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
        precision: 0.9,
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
        precision: 0.0,
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
        precision: 0.8,
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
