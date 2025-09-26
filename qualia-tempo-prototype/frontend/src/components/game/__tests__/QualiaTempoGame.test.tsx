import { describe, test, expect, beforeEach, vi } from "vitest";
/**
 * QualiaTempoGame Component Tests
 * QUALIA.CODE v1.1 compliant testing
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// Mock the hooks and services
vi.mock("../../../services/hooks");
vi.mock("../../../state/useGameStore");

// Mock React Three Fiber
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, ...props }: any) =>
    React.createElement("div", { "data-testid": "canvas", ...props }, children),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({})),
  extend: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: (props: any) =>
    React.createElement("div", { "data-testid": "orbit-controls", ...props }),
}));

vi.mock("@react-three/postprocessing", () => ({
  EffectComposer: ({ children, ...props }: any) =>
    React.createElement(
      "div",
      { "data-testid": "effect-composer", ...props },
      children,
    ),
  Bloom: (props: any) =>
    React.createElement("div", { "data-testid": "bloom", ...props }),
  ChromaticAberration: (props: any) =>
    React.createElement("div", {
      "data-testid": "chromatic-aberration",
      ...props,
    }),
}));

// Mock sub-components
vi.mock("../QualiaTempoHUD", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "qualia-tempo-hud" }),
}));

vi.mock("../PlayerAvatar", () => ({
  default: () => React.createElement("div", { "data-testid": "player-avatar" }),
}));

vi.mock("../QualiaFieldRenderer", () => ({
  default: () => React.createElement("div", { "data-testid": "qualia-field" }),
}));

vi.mock("../MusicalNotesRenderer", () => ({
  default: () => React.createElement("div", { "data-testid": "musical-notes" }),
}));

vi.mock("../BossRenderer", () => ({
  default: () => React.createElement("div", { "data-testid": "boss-renderer" }),
}));

vi.mock("../PlayerRenderer", () => ({
  default: () =>
    React.createElement("div", { "data-testid": "player-renderer" }),
}));

vi.mock("../GridRenderer", () => ({
  default: () => React.createElement("div", { "data-testid": "grid-renderer" }),
}));

// Mock ResizeObserver for three.js compatibility
(global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the hooks
const mockUseService = require("../../../services/hooks").useService;
const mockUseGameStore = require("../../../state/useGameStore").useGameStore;

const mockEventBus = {
  emit: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  once: vi.fn(),
  clear: vi.fn(),
};

const mockGameState = {
  isPlaying: true,
  backendConnected: true,
  isConfigLoaded: true,
  qualiaState: { intensity: 0.5, precision: 0.7 },
  player: { position: { x: 0, y: 0 }, health: 100 },
  combatData: null,
  totalNotes: 10,
  notesHit: 8,
  notesMissed: 2,
  currentStreak: 5,
  maxStreak: 8,
  pauseCooldownRemaining: 0,
  currentTime: 1000,
  gameStartTime: 0,
  score: 1000,
};

// Setup mocks before importing component
mockUseService.mockImplementation((serviceType: any) => {
  if (
    serviceType === require("../../../services/inversify.types").TYPES.IEventBus
  ) {
    return mockEventBus;
  }
  return {};
});

mockUseGameStore.mockImplementation((selector: any) => {
  if (typeof selector === "function") {
    return selector(mockGameState);
  }
  return mockGameState;
});

// Import the component under test AFTER mocks
import QualiaTempoGame from "../QualiaTempoGame";

describe("QualiaTempoGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders main game canvas", () => {
    render(<QualiaTempoGame />);

    const canvas = screen.getByTestId("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("renders all game components", () => {
    render(<QualiaTempoGame />);

    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("qualia-tempo-hud")).toBeInTheDocument();
  });
});
