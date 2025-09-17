/**
 * QualiaTempoGame Component Tests
 * QUALIA.CODE v1.0 compliant testing
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGameStore } from '../../../state/useGameStore';
import QualiaTempoGame from '../QualiaTempoGame';
import { CompositionRootProvider } from '../../../services/CompositionRoot.provider';
import { CompositionRoot, ServiceContainer } from '../../../services/CompositionRoot';
import { EventBus } from '../../../services/EventBus';
import { QualiaStateCalculatorService } from '../../../services/QualiaStateCalculatorService';
import { BackendSyncService } from '../../../services/BackendSyncService';
import { ErrorReportingService } from '../../../services/ErrorReportingService';
import { DebugService } from '../../../services/DebugService';
import { GameControllerService } from '../../../services/GameControllerService';
import { GameStateStoreService } from '../../../services/GameStateStoreService';
import { ConfigurationService } from '../../../services/ConfigurationService';
import { AudioService } from '../../../services/AudioService';
import { RhythmicMovementController } from '../../../services/RhythmicMovementController';
import { NotificationService } from '../../../services/NotificationService';
import { QualiaLogger } from '../../../services/Logger';

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

// Create simple mock objects
const mockEventBus = {
  emit: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  clear: jest.fn(),
};

const mockQualiaCalculator = {
  start: jest.fn(),
  stop: jest.fn(),
  calculateQualiaState: jest.fn(),
  getCurrentState: jest.fn(),
};

const mockBackendSync = {
  start: jest.fn(),
  stop: jest.fn(),
  isBackendConnected: jest.fn(),
  forceSync: jest.fn(),
  getConfig: jest.fn(),
};

const mockErrorReporting = {
  start: jest.fn(),
  stop: jest.fn(),
  logError: jest.fn(),
  getStatistics: jest.fn(),
  updateConfig: jest.fn(),
};

const mockDebugService = {
  start: jest.fn(),
  stop: jest.fn(),
  logEvent: jest.fn(),
  getMetrics: jest.fn(),
  enableProfiling: jest.fn(),
};

const mockGameController = {
  start: jest.fn(),
  stop: jest.fn(),
  handleStartGame: jest.fn(),
  handlePauseGame: jest.fn(),
  handleResetGame: jest.fn(),
};

const mockGameStateStore = {
  start: jest.fn(),
  stop: jest.fn(),
  handleGameStateChange: jest.fn(),
  handleQualiaStateUpdate: jest.fn(),
  getStatus: jest.fn(),
};

const mockConfigService = {
  loadConfig: jest.fn(),
  getConfig: jest.fn(),
  getGameConfig: jest.fn(),
  getQualiaConfig: jest.fn(),
  getBackendConfig: jest.fn(),
  isLoaded: jest.fn().mockReturnValue(true),
};

const mockAudioService = {
  initialize: jest.fn(),
  playSound: jest.fn(),
  stopSound: jest.fn(),
  setVolume: jest.fn(),
};

const mockRhythmicMovement = {
  start: jest.fn(),
  stop: jest.fn(),
  updatePosition: jest.fn(),
  getCurrentPosition: jest.fn(),
};

const mockNotificationService = {
  showNotification: jest.fn(),
  hideNotification: jest.fn(),
  updateConfig: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock the useServices hook directly
jest.mock('../../../services/hooks', () => ({
  useServices: () => ({
    eventBus: mockEventBus,
    qualiaCalculator: mockQualiaCalculator,
    backendSync: mockBackendSync,
    errorReporting: mockErrorReporting,
    debugService: mockDebugService,
    gameController: mockGameController,
    gameStateStore: mockGameStateStore,
    configService: mockConfigService,
    audioService: mockAudioService,
    rhythmicMovement: mockRhythmicMovement,
    notificationService: mockNotificationService,
    logger: mockLogger,
  }),
}));

// Test wrapper component - simplified without CompositionRootProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Helper function to render with wrapper
const renderWithProvider = (component: React.ReactElement) => {
  return render(<TestWrapper>{component}</TestWrapper>);
};

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
      renderWithProvider(<QualiaTempoGame isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('renders all game renderers', () => {
      renderWithProvider(<QualiaTempoGame isActive={true} />);
      
      expect(screen.getByTestId('qualia-tempo-hud')).toBeInTheDocument();
      expect(screen.getByTestId('qualia-field-renderer')).toBeInTheDocument();
      expect(screen.getByTestId('musical-notes-renderer')).toBeInTheDocument();
      expect(screen.getByTestId('boss-renderer')).toBeInTheDocument();
      expect(screen.getByTestId('player-renderer')).toBeInTheDocument();
    });

    it('renders visual effects', () => {
      renderWithProvider(<QualiaTempoGame isActive={true} />);
      
      expect(screen.getByTestId('effect-composer')).toBeInTheDocument();
      expect(screen.getByTestId('bloom')).toBeInTheDocument();
      expect(screen.getByTestId('chromatic-aberration')).toBeInTheDocument();
    });
  });

  describe('State Integration', () => {
    it('adapts Zustand state correctly', () => {
      renderWithProvider(<QualiaTempoGame isActive={true} />);
      
      // Verify store was called
      expect(mockUseGameStore).toHaveBeenCalled();
    });

    it('handles empty combat data', () => {
      const stateWithNullCombat = { ...mockGameState, combatData: null };
      mockUseGameStore.mockReturnValue(stateWithNullCombat);
      
      renderWithProvider(<QualiaTempoGame isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('accepts onGameAction callback prop', () => {
      const mockOnGameAction = jest.fn();
      
      renderWithProvider(<QualiaTempoGame onGameAction={mockOnGameAction} isActive={true} />);
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });

    it('respects isActive prop', () => {
      renderWithProvider(<QualiaTempoGame isActive={false} />);
      // Canvas should still be rendered, but controls are disabled
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });
});