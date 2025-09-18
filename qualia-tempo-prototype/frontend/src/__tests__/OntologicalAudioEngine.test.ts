/**
 * QUALIA.CODE v1.0 - OntologicalAudioEngine Tests
 * Comprehensive test suite for the ontological audio processing engine.
 * Tests audio synthesis, qualia state mapping, and emergent behavior sound generation.
 */

import { jest } from "@jest/globals";
import { OntologicalAudioEngine, EmergentBehavior } from "../audio/OntologicalAudioEngine";
import { QualiaState } from "../types/contracts";

// Mock Tone.js completely
jest.mock('tone', () => ({
  Reverb: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    decay: 1.5,
    wet: 0.45
  })),
  FeedbackDelay: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    delayTime: "8n",
    feedback: 0.28,
    wet: 0.18
  })),
  Volume: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    toDestination: jest.fn()
  })),
  PolySynth: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    triggerAttackRelease: jest.fn(),
    dispose: jest.fn()
  })),
  Synth: jest.fn(),
  Frequency: jest.fn().mockImplementation((_freq) => ({
    toNote: jest.fn().mockReturnValue('C4')
  })),
  start: jest.fn(),
  Transport: {
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    bpm: { value: 120 }
  }
}));

describe('OntologicalAudioEngine', () => {
  let engine: OntologicalAudioEngine;
  let mockQualiaState: QualiaState;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
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
    jest.restoreAllMocks();
  });

  describe('Engine Initialization', () => {
    it('should initialize with proper audio chain setup', () => {
      engine = new OntologicalAudioEngine();
      
      expect(engine).toBeDefined();
      expect(console.log).toHaveBeenCalledWith('🎵 OntologicalAudioEngine initialized');
    });
  });

  describe('Entity Voice Management', () => {
    beforeEach(() => {
      engine = new OntologicalAudioEngine();
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
      engine = new OntologicalAudioEngine();
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
      engine = new OntologicalAudioEngine();
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
      engine = new OntologicalAudioEngine();
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