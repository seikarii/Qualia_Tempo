/**
 * RhythmicMovementController.simplified.test.ts - Pragmatic Tests for Coverage
 * Focused on core functionality and maximizing coverage without complex DOM mocking
 */

import { jest } from '@jest/globals';

// Simple decorator mocks
jest.mock('../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  throttle: (_ms: number) => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor
}));

import { RhythmicMovementController } from '../services/RhythmicMovementController';
import { EventBus } from '../services/EventBus';

// Mock performance.now
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow } as any;

describe('RhythmicMovementController - Simplified Coverage Tests', () => {
  let eventBus: EventBus;
  let configService: any;
  let controller: RhythmicMovementController;
  let mockEventBusEmit: jest.MockedFunction<EventBus['emit']>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock EventBus
    eventBus = {
      emit: jest.fn(),
      subscribe: jest.fn().mockReturnValue('listener-id'),
      unsubscribe: jest.fn(),
      once: jest.fn(),
      clear: jest.fn()
    } as any;
    
    // Create mock ConfigurationService
    configService = {
      getConfig: jest.fn().mockReturnValue({
        services: {
          rhythmicMovement: {
            bpm: 120,
            perfectTiming: 100,
            goodTiming: 200,
            gridSize: 8,
            slowdownFactor: 1.0,
            slowdownDuration: 2000,
            keyThrottleMs: 100
          }
        }
      })
    };
    
    mockEventBusEmit = eventBus.emit as jest.MockedFunction<EventBus['emit']>;
    mockPerformanceNow.mockReturnValue(1000);
    
    // Create mock config
    const mockConfig = {
      bpm: 120,
      perfectTiming: 50,
      goodTiming: 100,
      gridSize: 64,
      slowdownFactor: 0.5,
      slowdownDuration: 1000,
      keyThrottleMs: 100
    };
    
    controller = new RhythmicMovementController(eventBus, configService, mockConfig);
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default values', () => {
      expect(controller).toBeInstanceOf(RhythmicMovementController);
      expect(controller.getPlayerPosition()).toEqual([4, 4]);
    });

    it('should load configuration correctly', () => {
      expect(configService.getConfig).toHaveBeenCalled();
    });
  });

  describe('Player Position Management', () => {
    it('should return current player position', () => {
      const position = controller.getPlayerPosition();
      expect(position).toEqual([4, 4]);
    });

    it('should calculate new positions correctly', () => {
      const northPos = (controller as any).calculateNewPosition('north');
      const southPos = (controller as any).calculateNewPosition('south');
      const eastPos = (controller as any).calculateNewPosition('east');
      const westPos = (controller as any).calculateNewPosition('west');
      
      expect(northPos).toEqual([4, 5]);
      expect(southPos).toEqual([4, 3]);
      expect(eastPos).toEqual([5, 4]);
      expect(westPos).toEqual([3, 4]);
    });

    it('should handle grid boundaries', () => {
      // Move to corner
      (controller as any).playerPosition = [0, 0];
      
      const invalidNorth = (controller as any).calculateNewPosition('north');
      const invalidWest = (controller as any).calculateNewPosition('west');
      
      expect(invalidNorth).toEqual([0, -1]); // Goes outside, but bounded by validation
      expect(invalidWest).toEqual([-1, 0]);  // Goes outside, but bounded by validation
      
      // Test the boundary validation
      expect((controller as any).isValidPosition([-1, 0])).toBe(false);
      expect((controller as any).isValidPosition([0, -1])).toBe(false);
      expect((controller as any).isValidPosition([0, 0])).toBe(true);
    });
  });

  describe('Direction Mapping', () => {
    it('should map keys to directions correctly', () => {
      expect((controller as any).getDirectionFromKey('w')).toBe('north');
      expect((controller as any).getDirectionFromKey('W')).toBe('north');
      expect((controller as any).getDirectionFromKey('s')).toBe('south');
      expect((controller as any).getDirectionFromKey('a')).toBe('west');
      expect((controller as any).getDirectionFromKey('d')).toBe('east');
      expect((controller as any).getDirectionFromKey('ArrowUp')).toBe('north');
      expect((controller as any).getDirectionFromKey('ArrowDown')).toBe('south');
      expect((controller as any).getDirectionFromKey('ArrowLeft')).toBe('west');
      expect((controller as any).getDirectionFromKey('ArrowRight')).toBe('east');
      expect((controller as any).getDirectionFromKey('x')).toBeNull();
    });
  });

  describe('Timing Analysis', () => {
    it('should calculate perfect timing', () => {
      const perfectTiming = (controller as any).calculateTiming(50); // Within 100ms perfect window
      expect(perfectTiming).toBe('perfect');
    });

    it('should calculate good timing', () => {
      const goodTiming = (controller as any).calculateTiming(150); // Within 200ms good window
      expect(goodTiming).toBe('good');
    });

    it('should calculate miss timing', () => {
      const missTiming = (controller as any).calculateTiming(250); // Outside 200ms window
      expect(missTiming).toBe('miss');
    });
  });

  describe('Service Lifecycle', () => {
    it('should start successfully with method spying', () => {
      const setupKeyboardSpy = jest.spyOn(controller as any, 'setupKeyboardListeners').mockImplementation(() => {});
      const setupGameStateSpy = jest.spyOn(controller as any, 'setupGameStateListener').mockImplementation(() => {});
      const startMetronomeSpy = jest.spyOn(controller as any, 'startMetronome').mockImplementation(() => {});
      
      controller.start();
      
      expect(setupKeyboardSpy).toHaveBeenCalled();
      expect(setupGameStateSpy).toHaveBeenCalled();
      expect(startMetronomeSpy).toHaveBeenCalled();
    });

    it('should stop successfully with method spying', () => {
      // Start first
      const setupKeyboardSpy = jest.spyOn(controller as any, 'setupKeyboardListeners').mockImplementation(() => {});
      const setupGameStateSpy = jest.spyOn(controller as any, 'setupGameStateListener').mockImplementation(() => {});
      const startMetronomeSpy = jest.spyOn(controller as any, 'startMetronome').mockImplementation(() => {});
      
      controller.start();
      
      // Verify spies were called during start
      expect(setupKeyboardSpy).toHaveBeenCalled();
      expect(setupGameStateSpy).toHaveBeenCalled();
      expect(startMetronomeSpy).toHaveBeenCalled();
      
      // Now test stop
      const removeKeyboardSpy = jest.spyOn(controller as any, 'removeKeyboardListeners').mockImplementation(() => {});
      const removeGameStateSpy = jest.spyOn(controller as any, 'removeGameStateListener').mockImplementation(() => {});
      const stopMetronomeSpy = jest.spyOn(controller as any, 'stopMetronome').mockImplementation(() => {});
      
      controller.stop();
      
      expect(removeKeyboardSpy).toHaveBeenCalled();
      expect(removeGameStateSpy).toHaveBeenCalled();
      expect(stopMetronomeSpy).toHaveBeenCalled();
    });

    it('should prevent multiple starts', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      (controller as any).isListening = true; // Simulate already started
      
      controller.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('RhythmicMovementController already started');
      consoleSpy.mockRestore();
    });

    it('should prevent stop when not running', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      controller.stop(); // Stop without starting
      
      expect(consoleSpy).toHaveBeenCalledWith('RhythmicMovementController not running');
      consoleSpy.mockRestore();
    });
  });

  describe('Dash Input Processing', () => {
    it('should process dash input when not paused', () => {
      mockPerformanceNow.mockReturnValue(1100);
      (controller as any).lastBeatTime = 1000;
      
      (controller as any).processDashInput('north');
      
      expect(mockEventBusEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RhythmicDash',
          direction: 'north',
          timing: 'perfect'
        })
      );
    });

    it('should ignore input when paused', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      (controller as any).isPaused = true;
      
      (controller as any).processDashInput('north');
      
      expect(consoleSpy).toHaveBeenCalledWith('🚫 Input ignored - game is paused');
      expect(mockEventBusEmit).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Game State Handling', () => {
    it('should handle pause state change', () => {
      const activatePauseSpy = jest.spyOn(controller as any, 'activatePauseWithSlowdown').mockImplementation(() => {});
      
      (controller as any).handleGameStateChange({ newState: 'Paused' });
      
      expect(activatePauseSpy).toHaveBeenCalled();
    });

    it('should handle resume state change', () => {
      (controller as any).isPaused = true;
      const resumeSpy = jest.spyOn(controller as any, 'resumeFromPause').mockImplementation(() => {});
      
      (controller as any).handleGameStateChange({ newState: 'Playing' });
      
      expect(resumeSpy).toHaveBeenCalled();
    });
  });

  describe('BPM Configuration', () => {
    it('should update BPM when not running', () => {
      controller.setBPM(140);
      
      expect((controller as any).bpm).toBe(140);
      expect((controller as any).beatInterval).toBeCloseTo(428.57, 1);
    });

    it('should restart metronome when running and BPM changes', () => {
      const stopSpy = jest.spyOn(controller as any, 'stopMetronome').mockImplementation(() => {});
      const startSpy = jest.spyOn(controller as any, 'startMetronome').mockImplementation(() => {});
      
      (controller as any).isListening = true;
      controller.setBPM(140);
      
      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Keyboard Event Handling', () => {
    it('should handle keydown events correctly', () => {
      const processSpy = jest.spyOn(controller as any, 'processDashInput').mockImplementation(() => {});
      const mockEvent = {
        key: 'w',
        preventDefault: jest.fn()
      };
      
      (controller as any).handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledWith('north');
    });

    it('should ignore invalid keys', () => {
      const processSpy = jest.spyOn(controller as any, 'processDashInput').mockImplementation(() => {});
      const mockEvent = {
        key: 'x',
        preventDefault: jest.fn()
      };
      
      (controller as any).handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(processSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined key gracefully', () => {
      const mockEvent = {
        key: undefined,
        preventDefault: jest.fn()
      };
      
      // Now it should not throw because we added null check
      expect(() => {
        (controller as any).handleKeyDown(mockEvent);
      }).not.toThrow();
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });
});
