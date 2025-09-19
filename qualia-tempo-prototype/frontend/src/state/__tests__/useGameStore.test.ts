import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from "@testing-library/react";
import { useGameStore } from "../useGameStore";
import { QualiaState } from "../../types/contracts";
import { CombatData } from "../../types/contracts";

describe("useGameStore - Passive State Container", () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState({
      isPlaying: false,
      currentTime: 0,
      gameStartTime: 0,
      player: {
        position: { x: 0, y: 0 },
        health: 100,
        combo: 0,
        score: 0,
        isMoving: false,
        lastRhythmHit: 0,
      },
      combatData: null,
      qualiaState: {
        intensity: 0,
        focus_level: 0,
        aggression: 0,
        flow: 0,
        chaos: 0,
        recovery: 0,
        transcendence: 0,
      },
      totalNotes: 0,
      notesHit: 0,
      notesMissed: 0,
      currentStreak: 0,
      maxStreak: 0,
      pauseCooldownRemaining: 0,
    });
  });
  test("initializes with correct default state", () => {
    const { result } = renderHook(() => useGameStore());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.gameStartTime).toBe(0);
    expect(result.current.player.position).toEqual({ x: 0, y: 0 });
    expect(result.current.player.health).toBe(100);
    expect(result.current.player.combo).toBe(0);
    expect(result.current.player.score).toBe(0);
    expect(result.current.player.isMoving).toBe(false);
    expect(result.current.player.lastRhythmHit).toBe(0);
    expect(result.current.combatData).toBeNull();
    expect(result.current.qualiaState.intensity).toBe(0);
    expect(result.current.qualiaState.focus_level).toBe(0);
    expect(result.current.qualiaState.aggression).toBe(0);
    expect(result.current.qualiaState.flow).toBe(0);
    expect(result.current.qualiaState.chaos).toBe(0);
    expect(result.current.qualiaState.recovery).toBe(0);
    expect(result.current.qualiaState.transcendence).toBe(0);
    expect(result.current.totalNotes).toBe(0);
    expect(result.current.notesHit).toBe(0);
    expect(result.current.notesMissed).toBe(0);
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.maxStreak).toBe(0);
    expect(result.current.pauseCooldownRemaining).toBe(0);
  });

  test("store can be updated externally (simulating GameStateStoreService)", () => {
    const { result } = renderHook(() => useGameStore());

    // Simulate external update (normally done by GameStateStoreService)
    act(() => {
      useGameStore.setState({
        isPlaying: true,
        currentTime: 10.5,
        gameStartTime: Date.now(),
        player: {
          ...result.current.player,
          combo: 5,
          score: 250,
        },
        qualiaState: {
          ...result.current.qualiaState,
          intensity: 0.8,
          flow: 0.9,
        },
        notesHit: 15,
        currentStreak: 8,
        maxStreak: 12,
      });
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTime).toBe(10.5);
    expect(result.current.gameStartTime).toBeGreaterThan(0);
    expect(result.current.player.combo).toBe(5);
    expect(result.current.player.score).toBe(250);
    expect(result.current.qualiaState.intensity).toBe(0.8);
    expect(result.current.qualiaState.flow).toBe(0.9);
    expect(result.current.notesHit).toBe(15);
    expect(result.current.currentStreak).toBe(8);
    expect(result.current.maxStreak).toBe(12);
  });

  test("store maintains state across re-renders", () => {
    const { result, rerender } = renderHook(() => useGameStore());

    // Update state
    act(() => {
      useGameStore.setState({
        isPlaying: true,
        notesHit: 5,
        qualiaState: {
          ...result.current.qualiaState,
          intensity: 0.5,
        },
      });
    });

    // Re-render
    rerender();

    // State should be preserved
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.notesHit).toBe(5);
    expect(result.current.qualiaState.intensity).toBe(0.5);
  });

  test("multiple external updates work correctly", () => {
    const { result } = renderHook(() => useGameStore());

    // First update
    act(() => {
      useGameStore.setState({
        isPlaying: true,
        notesHit: 3,
      });
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.notesHit).toBe(3);

    // Second update (partial)
    act(() => {
      useGameStore.setState({
        notesHit: 7,
        currentStreak: 5,
      });
    });

    expect(result.current.isPlaying).toBe(true); // Should be preserved
    expect(result.current.notesHit).toBe(7);
    expect(result.current.currentStreak).toBe(5);
  });

  test("selectors work correctly", () => {
    // Test useQualiaState selector
    const { result: qualiaResult } = renderHook(() =>
      useGameStore((state) => state.qualiaState),
    );
    expect(qualiaResult.current.intensity).toBe(0);

    // Test usePlayerState selector
    const { result: playerResult } = renderHook(() =>
      useGameStore((state) => state.player),
    );
    expect(playerResult.current.score).toBe(0); // Default value

    // Test useGameStats selector
    const { result: statsResult } = renderHook(() =>
      useGameStore((state) => ({
        notesHit: state.notesHit,
        notesMissed: state.notesMissed,
        accuracy:
          state.totalNotes > 0 ? (state.notesHit / state.totalNotes) * 100 : 0,
        currentStreak: state.currentStreak,
        maxStreak: state.maxStreak,
      })),
    );

    expect(statsResult.current.notesHit).toBe(0);
    expect(statsResult.current.notesMissed).toBe(0);
    expect(statsResult.current.accuracy).toBe(0); // No notes, so 0%
    expect(statsResult.current.currentStreak).toBe(0);
    expect(statsResult.current.maxStreak).toBe(0);
  });

  test("store handles complex state updates", () => {
    const { result } = renderHook(() => useGameStore());

    const mockCombatData: CombatData = {
      id: "test-combat",
      title: "Test Combat",
      artist: "Test Artist",
      audioPath: "test.mp3",
      bpm: 120,
      duration: 10.0,
      noteMap: [
        { timestamp: 1.0, position: { x: 100, y: 200 }, duration: 1.0 },
        { timestamp: 2.0, position: { x: 150, y: 250 }, duration: 1.0 },
      ],
      lyrics: [],
    };

    const newQualiaState: QualiaState = {
      intensity: 0.9,
      focus_level: 0.8,
      aggression: 0.7,
      flow: 0.95,
      chaos: 0.1,
      recovery: 0.2,
      transcendence: 0.3,
    };

    act(() => {
      useGameStore.setState({
        isPlaying: true,
        currentTime: 5.5,
        combatData: mockCombatData,
        qualiaState: newQualiaState,
        notesHit: 25,
        notesMissed: 3,
        currentStreak: 12,
        maxStreak: 15,
        pauseCooldownRemaining: 0.5,
        totalNotes: mockCombatData.noteMap.length, // Manually set totalNotes
      });
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTime).toBe(5.5);
    expect(result.current.combatData).toEqual(mockCombatData);
    expect(result.current.qualiaState).toEqual(newQualiaState);
    expect(result.current.totalNotes).toBe(2); // Manually set to match noteMap.length
    expect(result.current.notesHit).toBe(25);
    expect(result.current.notesMissed).toBe(3);
    expect(result.current.currentStreak).toBe(12);
    expect(result.current.maxStreak).toBe(15);
    expect(result.current.pauseCooldownRemaining).toBe(0.5);
  });
});
