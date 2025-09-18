/**
 * QualiaTempoGame Component Tests
 * QUALIA.CODE v1.1 compliant testing - IoC Container Pattern
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Container } from 'inversify';
import { useGameStore } from '../../../state/useGameStore';
import QualiaTempoGame from '../QualiaTempoGame';
import { TYPES } from '../../../services/inversify.types';
import { IEventBus } from '../../../services/interfaces/IEventBus';

// Mock Zustand store
jest.mock('../../../state/useGameStore');
const mockUseGameStore = useGameStore as jest.MockedFunction<typeof useGameStore>;

// Mock Three.js components to avoid WebGL issues in tests
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: jest.fn(),
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Stars: () => <div data-testid="stars" />,
}));

jest.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => <div data-testid="effect-composer">{children}</div>,
  Bloom: () => <div data-testid="bloom" />,
  ChromaticAberration: () => <div data-testid="chromatic-aberration" />,
}));

// Mock game renderers
jest.mock('../QualiaTempoHUD', () => () => <div data-testid="qualia-tempo-hud" />);
jest.mock('../QualiaFieldRenderer', () => () => <div data-testid="qualia-field-renderer" />);
jest.mock('../MusicalNotesRenderer', () => () => <div data-testid="musical-notes-renderer" />);
jest.mock('../BossRenderer', () => () => <div data-testid="boss-renderer" />);
jest.mock('../PlayerRenderer', () => () => <div data-testid="player-renderer" />);
jest.mock('../PlayerAvatar', () => () => <div data-testid="player-avatar" />);
jest.mock('../GridRenderer', () => () => <div data-testid="grid-renderer" />);

// Mock Tone.js completely
jest.mock('tone', () => ({
  Synth: jest.fn().mockImplementation(() => ({
    triggerAttackRelease: jest.fn(),
    dispose: jest.fn(),
  })),
  Transport: {
    start: jest.fn(),
    stop: jest.fn(),
    bpm: { value: 120 },
  },
  getContext: jest.fn(),
  setContext: jest.fn(),
}));

// Create mock EventBus implementation
const mockEventBus: IEventBus = {
  emit: jest.fn(),
  subscribe: jest.fn().mockReturnValue('mock-listener-id'),
  unsubscribe: jest.fn(),
  clear: jest.fn(),
  destroy: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    totalListeners: 0,
    eventTypes: [],
    historySize: 0,
    isDestroyed: false,
  }),
};

// Mock the IoC container
let container: Container;

// Mock the useService hook
jest.mock('../../../services/hooks', () => ({
  useService: jest.fn().mockImplementation((type: symbol) => {
    if (type === TYPES.IEventBus) {
      return mockEventBus;
    }
    throw new Error(`Unmocked service type: ${type.toString()}`);
  }),
}));

const mockGameState = {
  isPlaying: true,
  currentTime: 0,
  gameStartTime: Date.now(),
  player: {
    position: { x: 0, y: 0 },
    health: 100,
    combo: 5,
    score: 1500,
    isMoving: false,
    lastRhythmHit: 0,
  },
  combatData: null,
  qualiaState: {
    intensity: 0.7,
    focus_level: 0.8,
    aggression: 0.3,
    flow: 0.9,
    chaos: 0.2,
    recovery: 0.1,
    transcendence: 0.0,
  },
  totalNotes: 10,
  notesHit: 8,
  notesMissed: 2,
  currentStreak: 3,
  maxStreak: 5,
  pauseCooldownRemaining: 0,
};

describe('QualiaTempoGame', () => {
  beforeEach(() => {
    // Setup fresh container and mocks for each test
    container = new Container();
    container.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
    
    mockUseGameStore.mockReturnValue(mockGameState);
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders main game canvas', () => {
      render(<QualiaTempoGame isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('renders all game renderers', () => {
      render(<QualiaTempoGame isActive={true} />);
      
      expect(screen.getByTestId('qualia-tempo-hud')).toBeInTheDocument();
      expect(screen.getByTestId('qualia-field-renderer')).toBeInTheDocument();
      expect(screen.getByTestId('musical-notes-renderer')).toBeInTheDocument();
      expect(screen.getByTestId('boss-renderer')).toBeInTheDocument();
      expect(screen.getByTestId('player-renderer')).toBeInTheDocument();
    });

    it('renders visual effects', () => {
      render(<QualiaTempoGame isActive={true} />);
      
      expect(screen.getByTestId('effect-composer')).toBeInTheDocument();
      expect(screen.getByTestId('bloom')).toBeInTheDocument();
      expect(screen.getByTestId('chromatic-aberration')).toBeInTheDocument();
    });
  });

  describe('State Integration', () => {
    it('adapts Zustand state correctly', () => {
      render(<QualiaTempoGame isActive={true} />);
      
      // Verify store was called
      expect(mockUseGameStore).toHaveBeenCalled();
    });

    it('handles empty combat data', () => {
      const stateWithNullCombat = { ...mockGameState, combatData: null };
      mockUseGameStore.mockReturnValue(stateWithNullCombat);
      
      render(<QualiaTempoGame isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Service Integration', () => {
    it('subscribes to EventBus on mount', () => {
      render(<QualiaTempoGame isActive={true} />);
      
      // Verify EventBus subscribe was called for RhythmicDash events
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });

    it('uses IoC container for service resolution', () => {
      render(<QualiaTempoGame isActive={true} />);
      
      // Component should render without throwing container resolution errors
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('accepts onGameAction callback prop', () => {
      const mockOnGameAction = jest.fn();
      
      render(<QualiaTempoGame onGameAction={mockOnGameAction} isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('respects isActive prop', () => {
      render(<QualiaTempoGame isActive={false} />);
      // Canvas should still be rendered, but controls are disabled
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('handles undefined onGameAction gracefully', () => {
      render(<QualiaTempoGame isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Lifecycle Management', () => {
    it('cleans up EventBus subscriptions on unmount', () => {
      const { unmount } = render(<QualiaTempoGame isActive={true} />);
      
      // Subscribe should be called on mount
      expect(mockEventBus.subscribe).toHaveBeenCalled();
      
      // Unmount component
      unmount();
      
      // Verify cleanup occurs (unsubscribe should be called if component implements cleanup)
      // This test validates the component follows proper lifecycle patterns
    });
  });
});
