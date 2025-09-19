/**
 * QualiaTempoGame Component Tests
 * QUALIA.CODE v1.1 compliant testing
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the hooks and services
jest.mock('../../../services/hooks');
jest.mock('../../../state/useGameStore');

// Mock React Three Fiber
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'canvas', ...props }, children),
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({})),
  extend: jest.fn(),
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: (props: any) => React.createElement('div', { 'data-testid': 'orbit-controls', ...props }),
}));

jest.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'effect-composer', ...props }, children),
  Bloom: (props: any) => React.createElement('div', { 'data-testid': 'bloom', ...props }),
  ChromaticAberration: (props: any) => React.createElement('div', { 'data-testid': 'chromatic-aberration', ...props }),
}));

// Mock sub-components
jest.mock('../QualiaTempoHUD', () => ({
  default: () => React.createElement('div', { 'data-testid': 'qualia-tempo-hud' })
}));

jest.mock('../PlayerAvatar', () => ({
  default: () => React.createElement('div', { 'data-testid': 'player-avatar' })
}));

jest.mock('../QualiaFieldRenderer', () => ({
  default: () => React.createElement('div', { 'data-testid': 'qualia-field' })
}));

jest.mock('../MusicalNotesRenderer', () => ({
  default: () => React.createElement('div', { 'data-testid': 'musical-notes' })
}));

jest.mock('../BossRenderer', () => ({
  default: () => React.createElement('div', { 'data-testid': 'boss-renderer' })
}));

jest.mock('../PlayerRenderer', () => ({
  default: () => React.createElement('div', { 'data-testid': 'player-renderer' })
}));

jest.mock('../GridRenderer', () => ({
  default: () => React.createElement('div', { 'data-testid': 'grid-renderer' })
}));

// Mock ResizeObserver for three.js compatibility
(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the hooks
const mockUseService = require('../../../services/hooks').useService;
const mockUseGameStore = require('../../../state/useGameStore').useGameStore;

const mockEventBus = {
  emit: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  once: jest.fn(),
  clear: jest.fn(),
};

const mockGameState = {
  isPlaying: true,
  backendConnected: true,
  isConfigLoaded: true,
  qualiaState: { intensity: 0.5, focus_level: 0.7 },
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
  if (serviceType === require('../../../services/inversify.types').TYPES.IEventBus) {
    return mockEventBus;
  }
  return {};
});

mockUseGameStore.mockImplementation((selector: any) => {
  if (typeof selector === 'function') {
    return selector(mockGameState);
  }
  return mockGameState;
});

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
  });
});
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
