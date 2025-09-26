import { describe, test, expect, beforeEach, afterEach, vi, it, type Mocked } from 'vitest';
// AudioService.test.ts - IoC-compliant test suite for QUALIA.CODE audio management service
// Tests: Service lifecycle, event handling, rhythmic feedback, metronome functionality, entity voice management

import { createTestContainer, getMocksFromContainer } from '../../testing/test-container-factory';
import { TYPES } from '../inversify.types';
import type { IEventBus } from '../interfaces/IEventBus';
import type { IConfigurationService } from '../interfaces/IConfigurationService';
import type { IAudioService } from '../interfaces/IAudioService';
import type { QualiaState } from "../../types/contracts";
import type { QualiaStateUpdatedEvent } from "../EventBus";

// Decorators are globally mocked in setup.ts

// Mock Web Audio API for rhythmic feedback and metronome
const mockOscillator = {
  frequency: { value: 440 },
  type: "sine" as any, // Simplified for testing
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  gain: { value: 1 },
  connect: vi.fn(),
};

const mockAudioContext = {
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGainNode),
  destination: {},
  currentTime: 0,
  state: "running" as any, // Simplified for testing
  resume: vi.fn(),
  close: vi.fn(),
};

// Mock AudioContext constructor
Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

Object.defineProperty(window, "webkitAudioContext", {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

describe('AudioService', () => {
  let container: any;
  let audioService: any;
  let mockEventBus: Mocked<IEventBus>;
  let mockConfigService: Mocked<IConfigurationService>;
  let mockLogger: any;

  beforeEach(() => {
    // Create fresh test container for each test
    container = createTestContainer();
    const mocks = getMocksFromContainer(container);
    mockEventBus = mocks.mockEventBus as any;
    mockConfigService = mocks.mockConfigurationService as any;
    mockLogger = mocks.mockLogger as any;

    // Get service from container (cast to any to access extended methods not in interface)
    audioService = container.get(TYPES.IAudioService);
  });

  describe("Service Lifecycle", () => {
    it("should initialize correctly", async () => {
      await audioService.start();
      
      expect(audioService.isRunning()).toBe(true);
      const status = audioService.getStatus();
      expect(status.running).toBe(true);
      expect(status.engine).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith("✅ AudioService initialized successfully");
    });

    it("should not initialize twice", async () => {
      await audioService.start();
      await audioService.start();
      
      expect(mockLogger.warn).toHaveBeenCalledWith("AudioService already initialized");
    });

    it("should stop correctly", async () => {
      await audioService.start();
      await audioService.stop();
      
      expect(audioService.isRunning()).toBe(false);
      const status = audioService.getStatus();
      expect(status.running).toBe(false);
    });

    it("should handle stop when not running", async () => {
      await audioService.stop();
      expect(mockLogger.warn).toHaveBeenCalledWith("AudioService not initialized, nothing to stop");
    });

    it("should return correct status when stopped", () => {
      const status = audioService.getStatus();
      expect(status.running).toBe(false);
      expect(status.engine).toBe(false);
    });
  });

  describe("Event Handling", () => {
    beforeEach(async () => {
      await audioService.start();
      // Clear only the audio engine mocks, not the event bus subscriptions
      const audioEngineInstance = (audioService as any).audioEngine;
      audioEngineInstance.updateEntitySound.mockClear();
      audioEngineInstance.playEmergentPattern.mockClear();
      audioEngineInstance.createEntityVoice.mockClear();
      audioEngineInstance.removeEntityVoice.mockClear();
    });

    it("should handle QualiaStateUpdated events", () => {
      const mockQualiaState: QualiaState = {
        intensity: 0.8,
        precision: 0.7,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.2,
        transcendence: 0.3,
      };

      const event: QualiaStateUpdatedEvent = {
        type: "QualiaStateUpdated",
        qualiaState: mockQualiaState,
        timestamp: new Date(),
      };

      // Get the handler function that was registered
      const subscribeCall = mockEventBus.subscribe.mock.calls.find(
        (call: any) => call[0] === "QualiaStateUpdated"
      );
      const handler = subscribeCall![1];

      // Call the handler
      handler(event);

      const audioEngineInstance = (audioService as any).audioEngine;
      expect(audioEngineInstance.updateEntitySound).toHaveBeenCalledWith("player", mockQualiaState);
    });

    it("should trigger emergent pattern for high transcendence", () => {
      const mockQualiaState: QualiaState = {
        intensity: 0.9,
        precision: 0.7,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.2,
        transcendence: 0.85, // High transcendence
      };

      const event: QualiaStateUpdatedEvent = {
        type: "QualiaStateUpdated",
        qualiaState: mockQualiaState,
        timestamp: new Date(),
      };

      // Get and call the handler
      const subscribeCall = mockEventBus.subscribe.mock.calls.find(
        (call: any) => call[0] === "QualiaStateUpdated"
      );
      const handler = subscribeCall![1];
      handler(event);

      const audioEngineInstance = (audioService as any).audioEngine;
      expect(audioEngineInstance.playEmergentPattern).toHaveBeenCalledWith({
        type: "NARRATIVE_EVENT",
        entities: [],
        strength: 0.9,
        description: "Transcendence achievement",
        timestamp: expect.any(Number),
      });
    });

    it("should not trigger emergent pattern for low transcendence", () => {
      const mockQualiaState: QualiaState = {
        intensity: 0.9,
        precision: 0.7,
        aggression: 0.5,
        flow: 0.9,
        chaos: 0.1,
        recovery: 0.2,
        transcendence: 0.5, // Low transcendence
      };

      const event: QualiaStateUpdatedEvent = {
        type: "QualiaStateUpdated",
        qualiaState: mockQualiaState,
        timestamp: new Date(),
      };

      const subscribeCall = mockEventBus.subscribe.mock.calls.find(
        (call: any) => call[0] === "QualiaStateUpdated"
      );
      const handler = subscribeCall![1];
      handler(event);

      const audioEngineInstance = (audioService as any).audioEngine;
      expect(audioEngineInstance.playEmergentPattern).not.toHaveBeenCalled();
    });

    it("should setup event subscriptions", () => {
      // Verify event subscriptions were made
      expect(mockEventBus.subscribe).toHaveBeenCalledWith("QualiaStateUpdated", expect.any(Function));
    });
  });

  describe("Rhythmic Feedback", () => {
    beforeEach(async () => {
      await audioService.start();
      // Clear mocks
      mockAudioContext.createOscillator.mockClear();
      mockAudioContext.createGain.mockClear();
      mockOscillator.connect.mockClear();
      mockGainNode.connect.mockClear();
      mockLogger.info.mockClear();
      mockLogger.warn.mockClear();
    });

    it("should handle perfect timing feedback", () => {
      audioService.playRhythmicFeedback("perfect");

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockOscillator.frequency.value).toBe(880); // Perfect timing frequency
      expect(mockGainNode.gain.value).toBe(0.3);
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("🔊 Rhythmic feedback: perfect");
    });

    it("should handle good timing feedback", () => {
      audioService.playRhythmicFeedback("good");

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.frequency.value).toBe(660); // Good timing frequency
      expect(mockGainNode.gain.value).toBe(0.2);
      expect(mockLogger.info).toHaveBeenCalledWith("🔊 Rhythmic feedback: good");
    });

    it("should handle miss timing feedback", () => {
      audioService.playRhythmicFeedback("miss");

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.frequency.value).toBe(220); // Miss timing frequency
      expect(mockGainNode.gain.value).toBe(0.1);
      expect(mockLogger.info).toHaveBeenCalledWith("🔊 Rhythmic feedback: miss");
    });

    it("should handle rhythmic feedback when not initialized", () => {
      // Create a fresh container to get an uninitialized service
      const freshContainer = createTestContainer();
      const uninitializedAudioService = freshContainer.get<IAudioService>(TYPES.IAudioService) as any;

      uninitializedAudioService.playRhythmicFeedback("perfect");

      expect(mockLogger.warn).toHaveBeenCalledWith("AudioService not initialized, cannot play rhythmic feedback");
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe("Metronome Functionality", () => {
    beforeEach(async () => {
      await audioService.start();
      // Clear mocks
      mockAudioContext.createOscillator.mockClear();
      mockAudioContext.createGain.mockClear();
      mockOscillator.connect.mockClear();
      mockGainNode.connect.mockClear();
      mockLogger.info.mockClear();
      mockLogger.warn.mockClear();
    });

    it("should handle metronome tick", () => {
      audioService.playMetronomeTick();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockOscillator.frequency.value).toBe(800); // Metronome frequency
      expect(mockOscillator.type).toBe("square");
      expect(mockGainNode.gain.value).toBe(0.05); // Quiet metronome
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    it("should handle metronome tick when not initialized", () => {
      // Create a fresh container to get an uninitialized service
      const freshContainer = createTestContainer();
      const uninitializedAudioService = freshContainer.get<IAudioService>(TYPES.IAudioService) as any;

      uninitializedAudioService.playMetronomeTick();

      // Should fail silently for metronome - no warning logged
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe("Entity Voice Management", () => {
    const mockQualiaState: QualiaState = {
      intensity: 0.5,
      precision: 0.5,
      aggression: 0.0,
      flow: 0.5,
      chaos: 0.0,
      recovery: 0.0,
      transcendence: 0.0,
    };

    beforeEach(async () => {
      await audioService.start();
      // Clear mocks
      const audioEngineInstance = (audioService as any).audioEngine;
      audioEngineInstance.createEntityVoice.mockClear();
      audioEngineInstance.removeEntityVoice.mockClear();
      mockLogger.warn.mockClear();
    });

    it("should create entity voice when initialized", () => {
      audioService.createEntityVoice("test-entity", mockQualiaState);

      const audioEngineInstance = (audioService as any).audioEngine;
      expect(audioEngineInstance.createEntityVoice).toHaveBeenCalledWith("test-entity", mockQualiaState);
    });

    it("should not create entity voice when not initialized", () => {
      // Create a fresh container to get an uninitialized service
      const freshContainer = createTestContainer();
      const uninitializedAudioService = freshContainer.get<IAudioService>(TYPES.IAudioService) as any;

      uninitializedAudioService.createEntityVoice("test-entity", mockQualiaState);

      expect(mockLogger.warn).toHaveBeenCalledWith("AudioService not initialized, cannot create entity voice");
    });

    it("should remove entity voice when initialized", () => {
      audioService.removeEntityVoice("test-entity");

      const audioEngineInstance = (audioService as any).audioEngine;
      expect(audioEngineInstance.removeEntityVoice).toHaveBeenCalledWith("test-entity");
    });

    it("should remove all entity voices", () => {
      audioService.removeAllEntityVoices();

      const audioEngineInstance = (audioService as any).audioEngine;
      expect(audioEngineInstance.removeEntityVoice).toHaveBeenCalledWith("player");
      expect(audioEngineInstance.removeEntityVoice).toHaveBeenCalledWith("boss");
      expect(audioEngineInstance.removeEntityVoice).toHaveBeenCalledWith("environment");
    });

    it("should not remove entity voice when not initialized", () => {
      // Create a fresh container to get an uninitialized service
      const freshContainer = createTestContainer();
      const uninitializedAudioService = freshContainer.get<IAudioService>(TYPES.IAudioService) as any;

      uninitializedAudioService.removeEntityVoice("test-entity");

      expect(mockLogger.warn).toHaveBeenCalledWith("AudioService not initialized, cannot remove entity voice");
    });
  });

  describe("Error Handling", () => {
    it("should handle QualiaStateUpdated when audio engine is null", async () => {
      await audioService.start();
      
      // Manually set audio engine to null to simulate error state
      (audioService as any).audioEngine = null;

      const event: QualiaStateUpdatedEvent = {
        type: "QualiaStateUpdated",
        qualiaState: {
          intensity: 0.5,
          precision: 0.5,
          aggression: 0.0,
          flow: 0.5,
          chaos: 0.0,
          recovery: 0.0,
          transcendence: 0.0,
        },
        timestamp: new Date(),
      };

      const subscribeCall = mockEventBus.subscribe.mock.calls.find(
        (call: any) => call[0] === "QualiaStateUpdated"
      );
      const handler = subscribeCall![1];

      expect(() => handler(event)).not.toThrow();
    });

    it("should update status correctly when audio engine is removed", async () => {
      await audioService.start();
      
      // Remove audio engine to simulate cleanup
      (audioService as any).audioEngine = null;
      
      const status = audioService.getStatus();
      expect(status.running).toBe(true); // Service is still considered running
      expect(status.engine).toBe(false); // But engine is not available
    });
  });
});
