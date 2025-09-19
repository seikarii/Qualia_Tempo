import { describe, test, expect, beforeEach, afterEach, it, vi } from 'vitest';
/**
 * QUALIA.CODE v1.1 - OntologicalAudioEngine Tests - IOC COMPLIANT
 * Comprehensive test suite for the ontological audio processing engine.
 * Tests audio synthesis, qualia state mapping, and emergent behavior sound generation.
 * Uses InversifyJS container for dependency injection.
 */

import { container } from '../services/inversify.config';
import { TYPES } from '../services/inversify.types';
import type { IOntologicalAudioEngine, EmergentBehavior } from "../audio/IOntologicalAudioEngine";
import { QualiaLogger, LogLevel } from '../services/Logger';
import { QualiaState } from "../types/contracts";

// Mock Tone.js completely - EXPLICIT DEBUG VERSION
vi.mock('tone', () => {
  console.log('🔧 [MOCK] Setting up Tone.js mock');
  
  // Create the mock object that will be returned by constructors
  const createMockSynth = () => {
    const mockSynth = {
      connect: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      triggerAttack: vi.fn(),
      triggerRelease: vi.fn(),
      dispose: vi.fn(),
      set: vi.fn(),
      volume: { value: 0 },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.5,
        release: 1.0
      }
    };
    console.log('🔧 [MOCK] Created mock synth:', Object.keys(mockSynth));
    return mockSynth;
  };

  const createMockFrequency = (freq: any) => {
    const mockFreq = {
      toNote: vi.fn().mockReturnValue('C4'),
      valueOf: vi.fn().mockReturnValue(typeof freq === 'number' ? freq : 440),
      toFrequency: vi.fn().mockReturnValue(typeof freq === 'number' ? freq : 440)
    };
    console.log('🔧 [MOCK] Created mock frequency:', freq, Object.keys(mockFreq));
    return mockFreq;
  };

  // Mock constructors
  const MockPolySynth = vi.fn().mockImplementation((synthClass, options) => {
    console.log('🔧 [MOCK] PolySynth constructor called with:', synthClass, options);
    const mockSynth = createMockSynth();
    console.log('🔧 [MOCK] PolySynth returning:', Object.keys(mockSynth));
    return mockSynth;
  });

  const MockSynth = vi.fn().mockImplementation((options) => {
    console.log('🔧 [MOCK] Synth constructor called with:', options);
    const mockSynth = createMockSynth();
    console.log('🔧 [MOCK] Synth returning:', Object.keys(mockSynth));
    return mockSynth;
  });

  const MockFrequency = vi.fn().mockImplementation((freq) => {
    console.log('🔧 [MOCK] Frequency constructor called with:', freq);
    return createMockFrequency(freq);
  });

  const MockReverb = vi.fn().mockImplementation((options) => {
    console.log('🔧 [MOCK] Reverb constructor called with:', options);
    return {
      connect: vi.fn().mockReturnThis(),
      decay: 1.5,
      wet: 0.45
    };
  });

  const MockFeedbackDelay = vi.fn().mockImplementation((options) => {
    console.log('🔧 [MOCK] FeedbackDelay constructor called with:', options);
    return {
      connect: vi.fn().mockReturnThis(),
      delayTime: "8n",
      feedback: 0.28,
      wet: 0.18
    };
  });

  const MockVolume = vi.fn().mockImplementation((volume) => {
    console.log('🔧 [MOCK] Volume constructor called with:', volume);
    return {
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn()
    };
  });

  const mockExports = {
    PolySynth: MockPolySynth,
    Synth: MockSynth,
    Frequency: MockFrequency,
    Reverb: MockReverb,
    FeedbackDelay: MockFeedbackDelay,
    Volume: MockVolume,
    start: vi.fn(),
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      bpm: { value: 120 }
    }
  };

  console.log('🔧 [MOCK] Tone.js mock setup complete, exports:', Object.keys(mockExports));
  return mockExports;
});

describe('OntologicalAudioEngine - IOC COMPLIANT', () => {
  let engine: IOntologicalAudioEngine;
  let mockQualiaState: QualiaState;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid test output pollution
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Inject logger into IoC container
    container.unbind(TYPES.ILogger);
    container.bind<QualiaLogger>(TYPES.ILogger).toConstantValue(new QualiaLogger('Test', LogLevel.INFO));

    // Get service instance from container - NO MANUAL INSTANTIATION
    engine = container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine);
    
    mockQualiaState = {
      intensity: 0.5,
      focus_level: 0.7,
      aggression: 0.3,
      flow: 0.8,
      chaos: 0.1,
      recovery: 0.0,
      transcendence: 0.0,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Engine Initialization', () => {
    it('should initialize with proper audio chain setup', () => {
      expect(engine).toBeDefined();
      expect(console.log).toHaveBeenCalledWith('🎵 OntologicalAudioEngine initialized');
    });
  });

  describe('Entity Voice Management', () => {
    beforeEach(() => {
      engine = container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine);
    });

    it('should create entity voice with qualia-mapped parameters', () => {
      const entityId = 'test-entity-001';
      
      engine.createEntityVoice(entityId, mockQualiaState);
      
      // Verify that PolySynth was called with qualia-derived parameters
      const mockTone = require('tone');
      expect(mockTone.PolySynth).toHaveBeenCalled();
    });

    it('should not create duplicate voices for the same entity', () => {
      const entityId = 'test-entity-001';
      const mockTone = require('tone');
      
      engine.createEntityVoice(entityId, mockQualiaState);
      engine.createEntityVoice(entityId, mockQualiaState); // Duplicate call
      
      // Should only be called once
      expect(mockTone.PolySynth).toHaveBeenCalledTimes(1);
    });

    it('should update entity sound based on qualia state', () => {
      const entityId = 'test-entity-001';
      
      // First create the voice
      engine.createEntityVoice(entityId, mockQualiaState);
      
      // Then update it
      const aggressiveState: QualiaState = {
        ...mockQualiaState,
        aggression: 0.8, // Above threshold for sound trigger
        focus_level: 0.9
      };
      
      engine.updateEntitySound(entityId, aggressiveState);
      
      // Verify triggerAttackRelease was called on the synth
      const mockTone = require('tone');
      const synthInstance = mockTone.PolySynth.mock.results[0].value;
      expect(synthInstance.triggerAttackRelease).toHaveBeenCalled();
    });

    it('should not trigger sound for low aggression states', () => {
      const entityId = 'test-entity-001';
      
      engine.createEntityVoice(entityId, mockQualiaState);
      
      const passiveState: QualiaState = {
        ...mockQualiaState,
        aggression: 0.1 // Below threshold
      };
      
      engine.updateEntitySound(entityId, passiveState);
      
      const mockTone = require('tone');
      const synthInstance = mockTone.PolySynth.mock.results[0].value;
      expect(synthInstance.triggerAttackRelease).not.toHaveBeenCalled();
    });

    it('should handle updates for non-existent entities gracefully', () => {
      const nonExistentId = 'ghost-entity';
      
      // Should not throw error
      expect(() => {
        engine.updateEntitySound(nonExistentId, mockQualiaState);
      }).not.toThrow();
    });

    it('should remove entity voice and dispose resources', () => {
      const entityId = 'test-entity-001';
      
      // Create voice first
      engine.createEntityVoice(entityId, mockQualiaState);
      
      // Remove it
      engine.removeEntityVoice(entityId);
      
      // Verify dispose was called
      const mockTone = require('tone');
      const synthInstance = mockTone.PolySynth.mock.results[0].value;
      expect(synthInstance.dispose).toHaveBeenCalled();
    });

    it('should handle removal of non-existent entities gracefully', () => {
      const nonExistentId = 'ghost-entity';
      
      // Should not throw error
      expect(() => {
        engine.removeEntityVoice(nonExistentId);
      }).not.toThrow();
    });
  });

  describe('Emergent Behavior Processing', () => {
    beforeEach(() => {
      engine = container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine);
    });

    it('should process clustering behavior', () => {
      const clusteringBehavior: EmergentBehavior = {
        type: 'CLUSTERING',
        entities: [{ id: 'entity1' }, { id: 'entity2' }],
        strength: 0.7,
        description: 'Entity clustering detected'
      };

      expect(() => {
        engine.playEmergentPattern(clusteringBehavior);
      }).not.toThrow();
      
      // Should create a temporary PolySynth for the cluster harmony
      const mockTone = require('tone');
      expect(mockTone.PolySynth).toHaveBeenCalled();
    });

    it('should process synchronization behavior', () => {
      const syncBehavior: EmergentBehavior = {
        type: 'SYNCHRONIZATION',
        entities: [{ id: 'entity1' }, { id: 'entity2' }, { id: 'entity3' }],
        strength: 0.9,
        description: 'Synchronization pattern detected'
      };

      expect(() => {
        engine.playEmergentPattern(syncBehavior);
      }).not.toThrow();
      
      const mockTone = require('tone');
      expect(mockTone.PolySynth).toHaveBeenCalled();
    });

    it('should process state propagator behavior', () => {
      const propagatorBehavior: EmergentBehavior = {
        type: 'STATE_PROPAGATOR',
        entities: [{ id: 'propagator' }],
        strength: 0.5,
        description: 'State propagation detected'
      };

      expect(() => {
        engine.playEmergentPattern(propagatorBehavior);
      }).not.toThrow();
      
      const mockTone = require('tone');
      expect(mockTone.PolySynth).toHaveBeenCalled();
    });

    it('should process narrative event behavior', () => {
      const narrativeBehavior: EmergentBehavior = {
        type: 'NARRATIVE_EVENT',
        entities: [{ id: 'narrator' }],
        strength: 0.8,
        description: 'Narrative event triggered'
      };

      expect(() => {
        engine.playEmergentPattern(narrativeBehavior);
      }).not.toThrow();
      
      const mockTone = require('tone');
      expect(mockTone.PolySynth).toHaveBeenCalled();
    });
  });

  describe('Qualia State Mapping', () => {
    beforeEach(() => {
      engine = container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine);
    });

    it('should map different intensity levels to appropriate parameters', () => {
      // Test different intensity levels by creating voices
      const testCases = [
        { intensity: 0.95 }, // High intensity
        { intensity: 0.75 }, // Medium-high intensity
        { intensity: 0.45 }, // Medium intensity
        { intensity: 0.25 }, // Low intensity
        { intensity: 0.05 }  // Very low intensity
      ];

      testCases.forEach((testCase, index) => {
        const testState = { ...mockQualiaState, intensity: testCase.intensity };
        engine.createEntityVoice(`entity-${index}`, testState);
      });

      const mockTone = require('tone');
      expect(mockTone.PolySynth).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle extreme qualia values without errors', () => {
      const extremeState: QualiaState = {
        intensity: 1.0,
        focus_level: 1.0,
        aggression: 1.0,
        flow: 1.0,
        chaos: 1.0,
        recovery: 1.0,
        transcendence: 1.0,
      };

      expect(() => {
        engine.createEntityVoice('extreme-entity', extremeState);
        engine.updateEntitySound('extreme-entity', extremeState);
      }).not.toThrow();
    });

    it('should handle zero qualia values without errors', () => {
      const zeroState: QualiaState = {
        intensity: 0.0,
        focus_level: 0.0,
        aggression: 0.0,
        flow: 0.0,
        chaos: 0.0,
        recovery: 0.0,
        transcendence: 0.0,
      };

      expect(() => {
        engine.createEntityVoice('zero-entity', zeroState);
        engine.updateEntitySound('zero-entity', zeroState);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      engine = container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine);
    });

    it('should handle complete audio workflow', () => {
      // Create entities
      engine.createEntityVoice('entity1', mockQualiaState);
      engine.createEntityVoice('entity2', { ...mockQualiaState, intensity: 0.9 });
      
      // Update entities with aggressive behavior
      const aggressiveState = { ...mockQualiaState, aggression: 0.8 };
      engine.updateEntitySound('entity1', aggressiveState);
      engine.updateEntitySound('entity2', aggressiveState);
      
      // Process emergent behavior
      const emergentBehavior: EmergentBehavior = {
        type: 'CLUSTERING',
        entities: [{ id: 'entity1' }, { id: 'entity2' }],
        strength: 0.6
      };
      engine.playEmergentPattern(emergentBehavior);
      
      // Remove entities
      engine.removeEntityVoice('entity1');
      engine.removeEntityVoice('entity2');
      
      // Verify all operations completed without errors
      const mockTone = require('tone');
      expect(mockTone.PolySynth).toHaveBeenCalled();
    });

    it('should handle edge cases in sound generation', () => {
      const entityId = 'test-entity';
      
      // Create voice
      engine.createEntityVoice(entityId, mockQualiaState);
      
      // Test various aggression thresholds
      const testStates = [
        { ...mockQualiaState, aggression: 0.0 },   // No sound
        { ...mockQualiaState, aggression: 0.2 },   // At threshold
        { ...mockQualiaState, aggression: 0.21 },  // Above threshold
        { ...mockQualiaState, aggression: 1.0 },   // Maximum aggression
      ];
      
      testStates.forEach(state => {
        expect(() => {
          engine.updateEntitySound(entityId, state);
        }).not.toThrow();
      });
      
      // Cleanup
      engine.removeEntityVoice(entityId);
    });
  });
});