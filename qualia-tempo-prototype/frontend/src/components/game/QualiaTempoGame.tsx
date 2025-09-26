import React, { useEffect, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { Vector2 } from "three";
import { useGameStore } from "../../state/useGameStore";
import { useService } from "../../services/hooks";
import { TYPES } from "../../services/inversify.types";
import { IEventBus } from "../../services/interfaces/IEventBus";
import {
  PlayerActionEvent,
  RhythmicDashEvent,
  MetronomeTickEvent,
} from "../../services/EventBus";
import type { NoteData } from "../../types/contracts";

import QualiaTempoHUD from "./QualiaTempoHUD";
import PlayerAvatar from "./PlayerAvatar";
import QualiaFieldRenderer from "./QualiaFieldRenderer";
import MusicalNotesRenderer from "./MusicalNotesRenderer";
import BossRenderer from "./BossRenderer";
import PlayerRenderer from "./PlayerRenderer";
import GridRenderer from "./GridRenderer";

/**
 * QualiaTempoGame - Main Qualia Tempo game component integrated within MetacosmosViewer
 *
 * Features:
 * - Rhythm-based gameplay with visual feedback
 * - Real-time qualia field visualization
 * - Performance-driven music and visual enhancement
 * - Boss battle mechanics with phases
 * - Synesthetic experience combining music, light, and color
 */

interface QualiaTempoGameProps {
  onGameAction?: (_action: string, _data: any) => void;
  isActive?: boolean;
}

const QualiaTempoGame: React.FC<QualiaTempoGameProps> = ({
  onGameAction: _onGameAction,
  isActive = false,
}) => {
  const eventBus = useService<IEventBus>(TYPES.IEventBus);

  // Get real game state from Zustand store
  const zustandState = useGameStore();

  // QUALIA.CODE: Helper function for calculating note timing accuracy
  const calculateNoteAccuracy = useCallback(
    (currentTime: number, noteTimestamp: number): number => {
      const timeDiff = Math.abs(currentTime - noteTimestamp);
      const maxTiming = 200; // milliseconds window for a "good" hit
      const perfectTiming = 50; // milliseconds window for a "perfect" hit

      if (timeDiff <= perfectTiming) return 1.0;
      if (timeDiff <= maxTiming)
        return Math.max(0.5, 1.0 - timeDiff / maxTiming);
      return 0.0; // Miss
    },
    [],
  );

  // QUALIA.CODE: Memoized note transformation - Performance critical
  const renderedNotes = useMemo(() => {
    if (!zustandState.combatData?.noteMap) {
      return [];
    }

    // Transform NoteData from contracts to Note type for renderer
    return zustandState.combatData.noteMap.map((noteData: NoteData) => ({
      id: `note_${noteData.timestamp}_${noteData.position.x}_${noteData.position.y}`,
      type: "musical_note", // Default type for all notes
      timing: noteData.timestamp,
      position: [
        noteData.position.x,
        noteData.position.y,
        0, // Z position - can be calculated based on timing or other factors
      ] as [number, number, number],
      qualia_signature: `signature_${Math.floor(noteData.timestamp)}`, // Generate based on timing
    }));
  }, [zustandState.combatData?.noteMap]);

  // Subscribe to rhythmic movement events
  useEffect(() => {
    // Listen for rhythmic dash events to update player position
    const rhythmicDashListenerId = eventBus.subscribe<RhythmicDashEvent>(
      "RhythmicDash",
      (_event) => {
        // Position is updated in the store by GameStateStoreService
        // Component will re-render automatically when store changes
      },
    );

    // Listen for metronome ticks for audio feedback
    const metronomeListenerId = eventBus.subscribe<MetronomeTickEvent>(
      "MetronomeTick",
      (_event) => {
        // Visual or audio feedback for metronome tick
      },
    );

    return () => {
      eventBus.unsubscribe(rhythmicDashListenerId);
      eventBus.unsubscribe(metronomeListenerId);
    };
  }, [eventBus]);

  // Handle note hits with real logic (no mock)
  const handleNoteHit = useCallback(
    (noteId: string, accuracy: number) => {
      // QUALIA.CODE: Type-safe event emission with real game data
      eventBus.emit<PlayerActionEvent>({
        type: "PlayerAction",
        action: "HitNote",
        source: "QualiaTempoGame",
        context: { noteId, accuracy },
      });
    },
    [eventBus],
  );

  // Keyboard controls
  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Global game controls
      if (key === "p" || key === "escape") {
        event.preventDefault();
        // QUALIA.CODE: Type-safe event emission
        eventBus.emit<PlayerActionEvent>({
          type: "PlayerAction",
          action: "PauseGame",
          source: "QualiaTempoGame",
        });
        return;
      }

      // WASD Movement - REMOVED: Handled by RhythmicMovementController
      // Note hitting (Space/Enter) - Real implementation with game state
      if (key === " " || key === "enter") {
        event.preventDefault();

        // QUALIA.CODE: Real note hit logic based on current game state
        // Get the current notes from combat data
        const combatNotes = zustandState.combatData?.noteMap || [];

        if (combatNotes.length > 0) {
          // Calculate accuracy based on timing with the nearest note
          const currentTime = Date.now() / 1000; // Convert to seconds to match noteData.timestamp

          // Find the closest note by timestamp
          const nearestNote = combatNotes.reduce((closest, note) => {
            const currentDiff = Math.abs(currentTime - note.timestamp);
            const closestDiff = Math.abs(currentTime - closest.timestamp);
            return currentDiff < closestDiff ? note : closest;
          });

          const timingAccuracy = calculateNoteAccuracy(
            currentTime * 1000,
            nearestNote.timestamp * 1000,
          );

          if (timingAccuracy > 0) {
            // Emit real hit note event with calculated accuracy
            eventBus.emit<PlayerActionEvent>({
              type: "PlayerAction",
              action: "HitNote",
              source: "QualiaTempoGame",
              context: {
                noteTimestamp: nearestNote.timestamp,
                accuracy: timingAccuracy,
                points: Math.floor(timingAccuracy * 100),
                perfect: timingAccuracy > 0.9,
              },
            });
          } else {
            // Poor timing - this is a miss
            eventBus.emit<PlayerActionEvent>({
              type: "PlayerAction",
              action: "MissNote",
              source: "QualiaTempoGame",
              context: {
                reason: "poor_timing",
                noteTimestamp: nearestNote.timestamp,
              },
            });
          }
        } else {
          // No notes available - this is a miss
          eventBus.emit<PlayerActionEvent>({
            type: "PlayerAction",
            action: "MissNote",
            source: "QualiaTempoGame",
            context: {
              reason: "no_notes_available",
            },
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isActive, eventBus]);

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-10">
      {/* 3D Game Scene */}
      <Canvas
        data-testid="canvas"
        camera={{ position: [0, 8, 8], fov: 45, rotation: [-0.5, 0, 0] }}
        className="w-full h-full"
        style={{
          background: "linear-gradient(180deg, #0a0a2e 0%, #16213e 100%)",
        }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />

        {/* Enhanced lighting based on qualia state */}
        <pointLight
          position={[0, 5, 0]}
          intensity={zustandState.qualiaState.intensity * 2}
          color={`hsl(${zustandState.qualiaState.recovery * 360}, 80%, 60%)`}
        />

        {/* Game Elements */}
        <QualiaFieldRenderer
          qualiaField={{
            alpha: zustandState.qualiaState.intensity,
            beta: zustandState.qualiaState.flow,
            coherence: zustandState.qualiaState.precision,
          }}
          musicData={{
            intensity: zustandState.qualiaState.intensity,
            harmony: zustandState.qualiaState.flow,
            emotional_valence: zustandState.qualiaState.recovery,
            order_influence: zustandState.qualiaState.precision,
            chaos_influence: zustandState.qualiaState.chaos,
          }}
        />

        <PlayerRenderer
          player={{
            id: "player_1",
            name: "The Demiurge",
            position: [
              zustandState.player.position.x,
              0,
              zustandState.player.position.y,
            ],
            power_level: zustandState.player.health,
            consciousness_level: zustandState.qualiaState.transcendence,
            qualia_state: {
              emotional_valence: zustandState.qualiaState.recovery,
              arousal: zustandState.qualiaState.intensity,
              coherence: zustandState.qualiaState.precision,
            },
          }}
          performance={{
            accuracy:
              zustandState.notesHit / Math.max(1, zustandState.totalNotes),
            rhythm_sync: zustandState.qualiaState.flow,
            qualia_coherence: zustandState.qualiaState.precision,
          }}
        />

        <BossRenderer
          boss={{
            id: "boss_1",
            name: "Order Incarnate",
            position: [0, 5, 0],
            power_level: 100,
            phase: 1,
            stress_level: zustandState.qualiaState.chaos,
            qualia_state: {
              consciousness_density: 0.9,
              emotional_valence: -zustandState.qualiaState.chaos,
              arousal: zustandState.qualiaState.aggression,
              coherence: 1 - zustandState.qualiaState.chaos,
            },
          }}
          gameTime={zustandState.currentTime}
        />

        <MusicalNotesRenderer
          notes={renderedNotes} // QUALIA.CODE: Real notes from memoized transformation
          currentTime={zustandState.currentTime}
          onNoteHit={handleNoteHit}
        />

        {/* Game Grid - The core playfield */}
        <GridRenderer
          gridSize={8}
          tileSize={1}
          playerPosition={[
            zustandState.player.position.x,
            zustandState.player.position.y,
          ]}
          activePositions={[]}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />

        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom
            intensity={zustandState.qualiaState.intensity * 2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
          />
          <ChromaticAberration
            offset={new Vector2(zustandState.qualiaState.chaos * 0.002, 0)}
            radialModulation={false}
            modulationOffset={0.15}
          />
        </EffectComposer>
      </Canvas>

      {/* Game HUD Overlay */}
      <QualiaTempoHUD
        qualiaState={{
          intensity: zustandState.qualiaState.intensity,
          precision:
            zustandState.notesHit / Math.max(1, zustandState.totalNotes),
          aggression: 0,
          flow: zustandState.qualiaState.flow,
          chaos: zustandState.qualiaState.chaos,
          recovery: 0,
          transcendence: zustandState.qualiaState.transcendence / 100,
        }}
        playerHealth={zustandState.player.health}
        score={zustandState.player.score}
        music_data={{
          bpm: 120,
          emotional_valence: zustandState.qualiaState.recovery,
        }}
      />

      {/* Player Avatar */}
      <PlayerAvatar
        position={[
          zustandState.player.position.x,
          0,
          zustandState.player.position.y,
        ]}
        qualiaState={{
          intensity: zustandState.qualiaState.intensity,
          precision:
            zustandState.notesHit / Math.max(1, zustandState.totalNotes),
          aggression: 0,
          flow: zustandState.qualiaState.flow,
          chaos: zustandState.qualiaState.chaos,
          recovery: 0,
          transcendence: zustandState.qualiaState.transcendence / 100,
        }}
      />

      {/* Gameplay Instructions */}
      <div className="absolute bottom-5 left-5 bg-black bg-opacity-70 text-white p-2.5 rounded-md text-xs">
        <div>
          <strong>Controls:</strong>
        </div>
        <div>WASD: Move on Grid</div>
        <div>P/ESC: Pause Game</div>
        <div>SPACE/ENTER: Hit Notes</div>
        <div>WASD: Movement</div>
        <div>SPACE/ENTER: Hit Note</div>
        <div>
          Performance:{" "}
          {(
            (zustandState.notesHit / Math.max(1, zustandState.totalNotes)) *
            100
          ).toFixed(1)}
          %
        </div>
      </div>
    </div>
  );
};

export default QualiaTempoGame;
