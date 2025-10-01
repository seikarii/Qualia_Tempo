/**
 * QUALIA.CODE v1.1 - GameStateStoreService Contracts
 * Configuration and type definitions for game state store service
 */

export interface GameStateStoreConfig {
  resetValues: {
    player: {
      position: { x: number; y: number };
      health: number;
      combo: number;
      score: number;
      isMoving: boolean;
      lastRhythmHit: number;
    };
    qualiaState: {
      intensity: number;
      precision: number;
      aggression: number;
      flow: number;
      chaos: number;
      recovery: number;
      transcendence: number;
    };
    gameStats: {
      totalNotes: number;
      notesHit: number;
      notesMissed: number;
      currentStreak: number;
      maxStreak: number;
      pauseCooldownRemaining: number;
    };
    timing: {
      currentTime: number;
      gameStartTime: number;
    };
  };
  eventPriorities: {
    particleData: string;
  };
  messages: {
    initialized: string;
    alreadyStarted: string;
    startingListeners: string;
    listenersActive: string;
    notStarted: string;
    stoppingListeners: string;
    listenersStopped: string;
    stateUpdated: string;
    qualiaUpdated: string;
    rhythmicDash: string;
    constructed: string;
    processingGameStateChanged: string;
    processingQualiaUpdated: string;
    gameOver: string;
    unhandledState: string;
    storeSetter: string;
  };
}