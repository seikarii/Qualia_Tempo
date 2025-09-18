/**
 * QualiaTempoGame Component Tests
 * QUALIA.CODE v1.1 compliant testing - Jest Hoisting Compatible Solution
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock React Three Fiber with factory functions to avoid hoisting issues
jest.mock('@react-three/fiber', () => ({
  Canvas: function MockCanvas({ children, ...props }: any) {
    return React.createElement('div', { 'data-testid': 'canvas', ...props }, children);
  },
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({})),
  extend: jest.fn(),
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: function MockOrbitControls(props: any) {
    return React.createElement('div', { 'data-testid': 'orbit-controls', ...props });
  },
}));

jest.mock('@react-three/postprocessing', () => ({
  EffectComposer: function MockEffectComposer({ children, ...props }: any) {
    return React.createElement('div', { 'data-testid': 'effect-composer', ...props }, children);
  },
  Bloom: function MockBloom(props: any) {
    return React.createElement('div', { 'data-testid': 'bloom', ...props });
  },
  ChromaticAberration: function MockChromaticAberration(props: any) {
    return React.createElement('div', { 'data-testid': 'chromatic-aberration', ...props });
  },
}));

// Mock all game components
jest.mock('../QualiaTempoHUD', () => {
  return function MockQualiaTempoHUD(props: any) {
    return React.createElement('div', { 'data-testid': 'qualia-tempo-hud', ...props });
  };
});

jest.mock('../PlayerAvatar', () => {
  return function MockPlayerAvatar(props: any) {
    return React.createElement('div', { 'data-testid': 'player-avatar', ...props });
  };
});

jest.mock('../QualiaFieldRenderer', () => {
  return function MockQualiaFieldRenderer(props: any) {
    return React.createElement('div', { 'data-testid': 'qualia-field-renderer', ...props });
  };
});

jest.mock('../MusicalNotesRenderer', () => {
  return function MockMusicalNotesRenderer(props: any) {
    return React.createElement('div', { 'data-testid': 'musical-notes-renderer', ...props });
  };
});

jest.mock('../BossRenderer', () => {
  return function MockBossRenderer(props: any) {
    return React.createElement('div', { 'data-testid': 'boss-renderer', ...props });
  };
});

jest.mock('../PlayerRenderer', () => {
  return function MockPlayerRenderer(props: any) {
    return React.createElement('div', { 'data-testid': 'player-renderer', ...props });
  };
});

jest.mock('../GridRenderer', () => {
  return function MockGridRenderer(props: any) {
    return React.createElement('div', { 'data-testid': 'grid-renderer', ...props });
  };
});

// Mock services
jest.mock('../../../services/hooks', () => ({
  useService: jest.fn(() => ({
    emit: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

// Mock store
jest.mock('../../../state/useGameStore', () => ({
  useGameStore: jest.fn(() => ({
    gameState: 'idle',
    qualiaState: {
      consciousness: 0,
      attention: 0,
      clarity: 0,
      flow: 0,
      intensity: 50,
      transcendence: 0
    },
    player: {
      position: { x: 0, y: 0 },
      health: 100,
      score: 0
    },
    isPlaying: false,
    score: 0
  })),
}));

// Import the component under test AFTER mocks
import QualiaTempoGame from '../QualiaTempoGame';

describe('QualiaTempoGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders main game canvas', () => {
    render(<QualiaTempoGame />);
    
    const canvas = screen.getByTestId('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders all game components', () => {
    render(<QualiaTempoGame />);
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('qualia-tempo-hud')).toBeInTheDocument();
    expect(screen.getByTestId('player-avatar')).toBeInTheDocument();
  });
});
