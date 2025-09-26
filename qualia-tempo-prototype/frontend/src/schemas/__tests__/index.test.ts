/**
 * QUALIA.CODE v1.1 - Schema Definitions Tests
 * Comprehensive test suite for Zod schema validation and type definitions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import {
  QualiaStateSchema,
  PlayerStateSchema,
  CombatDataSchema,
  schemaRegistry,
  type QualiaState,
  type PlayerState,
  type CombatData,
} from "../index";

describe("Schema Definitions", () => {
  describe("QualiaStateSchema", () => {
    it("should validate a valid QualiaState object", () => {
      const validQualiaState = {
        intensity: 0.8,
        precision: 0.9,
        aggression: 0.6,
        flow: 0.7,
        chaos: 0.3,
        recovery: 0.4,
        transcendence: 0.2,
      };

      const result = QualiaStateSchema.safeParse(validQualiaState);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validQualiaState);
    });

    it("should reject QualiaState with values outside 0-1 range", () => {
      const invalidQualiaState = {
        intensity: 1.5, // > 1
        precision: -0.1, // < 0
        aggression: 0.6,
        flow: 0.7,
        chaos: 0.3,
        recovery: 0.4,
        transcendence: 0.2,
      };

      const result = QualiaStateSchema.safeParse(invalidQualiaState);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
      }
    });

    it("should reject QualiaState with missing required properties", () => {
      const incompleteQualiaState = {
        intensity: 0.8,
        precision: 0.9,
        aggression: 0.6,
        flow: 0.7,
        chaos: 0.3,
        recovery: 0.4,
        // Missing transcendence
      };

      const result = QualiaStateSchema.safeParse(incompleteQualiaState);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
      }
    });

    it("should reject QualiaState with extra properties", () => {
      const extraPropertiesQualiaState = {
        intensity: 0.8,
        precision: 0.9,
        aggression: 0.6,
        flow: 0.7,
        chaos: 0.3,
        recovery: 0.4,
        transcendence: 0.2,
        extraProperty: "should not be here",
      };

      const result = QualiaStateSchema.safeParse(extraPropertiesQualiaState);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
      }
    });

    it("should validate boundary values (0 and 1)", () => {
      const boundaryQualiaState = {
        intensity: 0,
        precision: 1,
        aggression: 0,
        flow: 1,
        chaos: 0,
        recovery: 1,
        transcendence: 0,
      };

      const result = QualiaStateSchema.safeParse(boundaryQualiaState);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(boundaryQualiaState);
    });

    it("should handle floating point precision correctly", () => {
      const floatQualiaState = {
        intensity: 0.123456789,
        precision: 0.987654321,
        aggression: 0.555555555,
        flow: 0.111111111,
        chaos: 0.999999999,
        recovery: 0.000000001,
        transcendence: 0.5,
      };

      const result = QualiaStateSchema.safeParse(floatQualiaState);
      expect(result.success).toBe(true);
    });

    it("should provide helpful error messages", () => {
      const invalidQualiaState = {
        intensity: "not a number",
        precision: 0.9,
        aggression: 0.6,
        flow: 0.7,
        chaos: 0.3,
        recovery: 0.4,
        transcendence: 0.2,
      };

      const result = QualiaStateSchema.safeParse(invalidQualiaState);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Expected number");
      }
    });
  });

  describe("PlayerStateSchema", () => {
    it("should validate a valid PlayerState object", () => {
      const validPlayerState = {
        position: { x: 10, y: 20 },
        health: 85,
        combo: 5,
        score: 1250,
        isMoving: true,
        lastRhythmHit: 1234567890,
      };

      const result = PlayerStateSchema.safeParse(validPlayerState);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPlayerState);
    });

    it("should reject PlayerState with invalid health values", () => {
      const invalidHealthStates = [
        { health: -1 },
        { health: 101 },
        { health: 50.5 }, // Should be integer
      ];

      invalidHealthStates.forEach((invalidState) => {
        const result = PlayerStateSchema.safeParse({
          position: { x: 10, y: 20 },
          combo: 5,
          score: 1250,
          isMoving: true,
          lastRhythmHit: 1234567890,
          ...invalidState,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should reject PlayerState with negative combo or score", () => {
      const invalidStates = [{ combo: -1 }, { score: -100 }];

      invalidStates.forEach((invalidState) => {
        const result = PlayerStateSchema.safeParse({
          position: { x: 10, y: 20 },
          health: 85,
          isMoving: true,
          lastRhythmHit: 1234567890,
          ...invalidState,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should validate position coordinates correctly", () => {
      const validPositions = [
        { x: 0, y: 0 },
        { x: 100, y: 200 },
        { x: -50, y: 75 },
        { x: 0.5, y: 0.5 }, // Should accept floats
      ];

      validPositions.forEach((position) => {
        const result = PlayerStateSchema.safeParse({
          position,
          health: 85,
          combo: 5,
          score: 1250,
          isMoving: true,
          lastRhythmHit: 1234567890,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("CombatDataSchema", () => {
    it("should validate a valid CombatData object", () => {
      const validCombatData = {
        id: "combat_001",
        title: "Epic Battle",
        artist: "Game Composer",
        audioPath: "/audio/track1.mp3",
        bpm: 120,
        duration: 180,
        noteMap: [
          {
            timestamp: 1.5,
            position: { x: 10, y: 20 },
            duration: 0.5,
          },
          {
            timestamp: 3.0,
            position: { x: 30, y: 40 },
            duration: 0.3,
          },
        ],
        lyrics: [
          {
            timestamp: 5.0,
            text: "This is a lyric line",
          },
        ],
      };

      const result = CombatDataSchema.safeParse(validCombatData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validCombatData);
    });

    it("should reject CombatData with invalid BPM", () => {
      const invalidBPMData = {
        id: "combat_001",
        title: "Epic Battle",
        artist: "Game Composer",
        audioPath: "/audio/track1.mp3",
        bpm: 0, // Invalid: must be >= 1
        duration: 180,
        noteMap: [],
        lyrics: [],
      };

      const result = CombatDataSchema.safeParse(invalidBPMData);
      expect(result.success).toBe(false);
    });

    it("should reject CombatData with negative duration", () => {
      const invalidDurationData = {
        id: "combat_001",
        title: "Epic Battle",
        artist: "Game Composer",
        audioPath: "/audio/track1.mp3",
        bpm: 120,
        duration: -10, // Invalid: must be >= 0
        noteMap: [],
        lyrics: [],
      };

      const result = CombatDataSchema.safeParse(invalidDurationData);
      expect(result.success).toBe(false);
    });

    it("should validate noteMap structure correctly", () => {
      const validNoteMapData = {
        id: "combat_001",
        title: "Epic Battle",
        artist: "Game Composer",
        audioPath: "/audio/track1.mp3",
        bpm: 120,
        duration: 180,
        noteMap: [
          {
            timestamp: 0,
            position: { x: 0, y: 0 },
            duration: 0,
          },
        ],
        lyrics: [],
      };

      const result = CombatDataSchema.safeParse(validNoteMapData);
      expect(result.success).toBe(true);
    });

    it("should validate lyrics structure correctly", () => {
      const validLyricsData = {
        id: "combat_001",
        title: "Epic Battle",
        artist: "Game Composer",
        audioPath: "/audio/track1.mp3",
        bpm: 120,
        duration: 180,
        noteMap: [],
        lyrics: [
          {
            timestamp: 0,
            text: "",
          },
          {
            timestamp: 10,
            text: "Multi\nline\nlyrics",
          },
        ],
      };

      const result = CombatDataSchema.safeParse(validLyricsData);
      expect(result.success).toBe(true);
    });
  });

  describe("Schema Registry", () => {
    it("should contain all required schemas", () => {
      expect(schemaRegistry).toHaveProperty("QualiaState");
      expect(schemaRegistry).toHaveProperty("PlayerState");
      expect(schemaRegistry).toHaveProperty("CombatData");

      expect(schemaRegistry.QualiaState).toBe(QualiaStateSchema);
      expect(schemaRegistry.PlayerState).toBe(PlayerStateSchema);
      expect(schemaRegistry.CombatData).toBe(CombatDataSchema);
    });

    it("should be immutable", () => {
      const originalRegistry = { ...schemaRegistry };

      // Attempt to modify registry
      try {
        (schemaRegistry as any).newSchema = "test";
      } catch (error) {
        // Expected in strict mode
      }

      expect(schemaRegistry).toEqual(originalRegistry);
    });

    it("should provide consistent schema instances", () => {
      const registry1 = schemaRegistry;
      const registry2 = schemaRegistry;

      expect(registry1.QualiaState).toBe(registry2.QualiaState);
      expect(registry1.PlayerState).toBe(registry2.PlayerState);
      expect(registry1.CombatData).toBe(registry2.CombatData);
    });
  });

  describe("TypeScript Types", () => {
    it("should correctly infer QualiaState type", () => {
      const qualiaState: QualiaState = {
        intensity: 0.8,
        precision: 0.9,
        aggression: 0.6,
        flow: 0.7,
        chaos: 0.3,
        recovery: 0.4,
        transcendence: 0.2,
      };

      expect(qualiaState.intensity).toBe(0.8);
      expect(typeof qualiaState.intensity).toBe("number");
    });

    it("should correctly infer PlayerState type", () => {
      const playerState: PlayerState = {
        position: { x: 10, y: 20 },
        health: 85,
        combo: 5,
        score: 1250,
        isMoving: true,
        lastRhythmHit: 1234567890,
      };

      expect(playerState.position.x).toBe(10);
      expect(playerState.health).toBe(85);
      expect(playerState.isMoving).toBe(true);
    });

    it("should correctly infer CombatData type", () => {
      const combatData: CombatData = {
        id: "combat_001",
        title: "Epic Battle",
        artist: "Game Composer",
        audioPath: "/audio/track1.mp3",
        bpm: 120,
        duration: 180,
        noteMap: [],
        lyrics: [],
      };

      expect(combatData.id).toBe("combat_001");
      expect(combatData.bpm).toBe(120);
      expect(Array.isArray(combatData.noteMap)).toBe(true);
      expect(Array.isArray(combatData.lyrics)).toBe(true);
    });
  });

  describe("Schema Validation Edge Cases", () => {
    it("should handle null values correctly", () => {
      const nullValueTests = [
        { intensity: null },
        { precision: null },
        { aggression: null },
      ];

      nullValueTests.forEach((testCase) => {
        const result = QualiaStateSchema.safeParse({
          intensity: 0.5,
          precision: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.5,
          ...testCase,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should handle undefined values correctly", () => {
      const undefinedValueTests = [
        { intensity: undefined },
        { precision: undefined },
        { aggression: undefined },
      ];

      undefinedValueTests.forEach((testCase) => {
        const result = QualiaStateSchema.safeParse({
          intensity: 0.5,
          precision: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.5,
          ...testCase,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should handle NaN values correctly", () => {
      const nanValueTests = [
        { intensity: NaN },
        { precision: NaN },
        { aggression: NaN },
      ];

      nanValueTests.forEach((testCase) => {
        const result = QualiaStateSchema.safeParse({
          intensity: 0.5,
          precision: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.5,
          ...testCase,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should handle Infinity values correctly", () => {
      const infinityValueTests = [
        { intensity: Infinity },
        { precision: -Infinity },
        { aggression: Infinity },
      ];

      infinityValueTests.forEach((testCase) => {
        const result = QualiaStateSchema.safeParse({
          intensity: 0.5,
          precision: 0.5,
          aggression: 0.5,
          flow: 0.5,
          chaos: 0.5,
          recovery: 0.5,
          transcendence: 0.5,
          ...testCase,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Schema Performance", () => {
    it("should validate large datasets efficiently", () => {
      const largeQualiaState = {
        intensity: 0.5,
        precision: 0.7,
        aggression: 0.3,
        flow: 0.8,
        chaos: 0.2,
        recovery: 0.6,
        transcendence: 0.4,
      };

      // Test multiple validations don't cause performance issues
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        QualiaStateSchema.safeParse(largeQualiaState);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms for 1000 validations)
      expect(duration).toBeLessThan(100);
    });
  });
});
