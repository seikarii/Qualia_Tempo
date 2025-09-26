import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Subtitles } from "../Subtitles";
import { useGameStore } from "../../state/useGameStore";

// Mock the Zustand store
vi.mock("../../state/useGameStore", () => ({
  useGameStore: vi.fn(),
}));

const mockUseGameStore = useGameStore as MockedFunction<typeof useGameStore>;

// Helper to create a mock store that handles selectors
const createMockStore = (state: any) => {
  return (selector?: (_state: any) => any) => {
    if (selector) {
      return selector(state);
    }
    return state;
  };
};

describe("Subtitles Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders nothing when no combat data", () => {
    mockUseGameStore.mockImplementation(
      createMockStore({
        currentTime: 10,
        combatData: null,
        isPlaying: true,
      }),
    );

    const { container } = render(<Subtitles />);
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when not playing", () => {
    mockUseGameStore.mockImplementation(
      createMockStore({
        currentTime: 10,
        combatData: {
          id: "test",
          title: "Test Combat",
          duration: 100,
          noteMap: [],
          lyrics: [{ timestamp: 5, text: "Test lyric" }],
        },
        isPlaying: false,
      }),
    );

    const { container } = render(<Subtitles />);
    expect(container.firstChild).toBeNull();
  });

  test("renders current lyric within time window", () => {
    mockUseGameStore.mockImplementation(
      createMockStore({
        currentTime: 5.5, // Within 3 seconds of timestamp 5
        combatData: {
          id: "test",
          title: "Test Combat",
          duration: 100,
          noteMap: [],
          lyrics: [{ timestamp: 5, text: "Test lyric" }],
        },
        isPlaying: true,
      }),
    );

    render(<Subtitles />);

    expect(screen.getByText("Test lyric")).toBeInTheDocument();
  });

  test("renders nothing when lyric is too old", () => {
    mockUseGameStore.mockImplementation(
      createMockStore({
        currentTime: 10, // More than 3 seconds after timestamp 5
        combatData: {
          id: "test",
          title: "Test Combat",
          duration: 100,
          noteMap: [],
          lyrics: [{ timestamp: 5, text: "Test lyric" }],
        },
        isPlaying: true,
      }),
    );

    const { container } = render(<Subtitles />);
    expect(container.firstChild).toBeNull();
  });

  test("renders most recent lyric within time window", () => {
    mockUseGameStore.mockImplementation(
      createMockStore({
        currentTime: 8, // Should show lyric at timestamp 7
        combatData: {
          id: "test",
          title: "Test Combat",
          duration: 100,
          noteMap: [],
          lyrics: [
            { timestamp: 5, text: "First lyric" },
            { timestamp: 7, text: "Second lyric" },
            { timestamp: 10, text: "Third lyric" },
          ],
        },
        isPlaying: true,
      }),
    );

    render(<Subtitles />);

    expect(screen.getByText("Second lyric")).toBeInTheDocument();
    expect(screen.queryByText("First lyric")).not.toBeInTheDocument();
    expect(screen.queryByText("Third lyric")).not.toBeInTheDocument();
  });

  test("applies custom className", () => {
    mockUseGameStore.mockImplementation(
      createMockStore({
        currentTime: 5.5,
        combatData: {
          id: "test",
          title: "Test Combat",
          duration: 100,
          noteMap: [],
          lyrics: [{ timestamp: 5, text: "Test lyric" }],
        },
        isPlaying: true,
      }),
    );

    const { container } = render(<Subtitles className="custom-subtitle" />);

    expect(container.firstChild).toHaveClass("custom-subtitle");
  });
});
