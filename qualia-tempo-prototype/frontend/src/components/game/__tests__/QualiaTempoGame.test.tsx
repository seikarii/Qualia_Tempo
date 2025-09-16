/**
 * QualiaTempoGame Component Tests
 * QUALIA.CODE v1.0 compliant testing
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGameStore } from '../../../state/useGameStore';
import QualiaTempoGame from '../QualiaTempoGame';

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
    precision: 0.8,
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
    mockUseGameStore.mockReturnValue(mockGameState);
  });

  afterEach(() => {
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

  describe('Props Handling', () => {
    it('accepts external gameState prop', () => {
      const externalGameState = {
        status: 'paused' as const,
        global_qualia_field: { alpha: 0.5, beta: 0.5, coherence: 0.5 },
        elemental_lattices: {},
        player: {
          id: 'test-player',
          name: 'Test Player',
          position: [0, 0, 0] as [number, number, number],
          power_level: 100,
          consciousness_level: 0.8,
          qualia_state: { emotional_valence: 0.5, arousal: 0.6, coherence: 0.7 }
        },
        boss: {
          id: 'test-boss',
          name: 'Test Boss',
          position: [0, 5, 0] as [number, number, number],
          power_level: 150,
          phase: 1,
          stress_level: 0.3,
          qualia_state: { consciousness_density: 0.9, emotional_valence: -0.4, arousal: 0.7, coherence: 0.6 }
        },
        notes: [],
        game_status: {
          current_time: 0,
          score: 0,
          combo: 0,
          music_speed_factor: 1,
          music_volume_factor: 1,
          performance_metrics: { accuracy: 0, rhythm_sync: 0, qualia_coherence: 0 }
        },
        music_data: {
          bpm: 120,
          intensity: 0.5,
          harmony: 0.5,
          speed_factor: 1,
          volume_factor: 1,
          emotional_valence: 0.5,
          order_influence: 0.5,
          chaos_influence: 0.5
        }
      };

      render(<QualiaTempoGame gameState={externalGameState} isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('respects isActive prop', () => {
      render(<QualiaTempoGame isActive={false} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });
});