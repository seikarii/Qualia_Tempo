import React, { useEffect, useCallback, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { Vector2 } from "three";
import * as THREE from "three";
import { useGameStore } from "../../state/useGameStore";
import { useCoordinateSystemService, useConfiguration, useGameInputControllerService } from "../../services/hooks";
import type {
  PlayerActionEvent,
  RhythmicDashEvent,
  MetronomeTickEvent,
} from "../../services/contracts/events.contracts";
import type { NoteData } from "../../types/contracts";

import QualiaTempoHUD from "./QualiaTempoHUD";
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

// QUALIA.CODE v1.1: PlayerAvatar ELIMINATED - Only 3D PlayerRenderer remains
// The 2D PlayerAvatar component has been completely removed to eliminate the double avatar issue

// QUALIA.CODE v1.1: GridRenderer wrapper that uses configuration instead of hardcoded values
interface ConfigurableGridRendererProps {
  playerPosition: { x: number; y: number };
  activePositions: [number, number][];
}

const ConfigurableGridRenderer: React.FC<ConfigurableGridRendererProps> = ({ 
  playerPosition, 
  activePositions 
}) => {
  const coordinateSystemService = useCoordinateSystemService();
  
  // Get grid configuration from the coordinate system service
  const { gridSize, tileSize } = coordinateSystemService.getGridConfig();
  
  return (
    <GridRenderer
      gridSize={gridSize}
      tileSize={tileSize}
      playerPosition={playerPosition}
      activePositions={activePositions}
    />
  );
};

const QualiaTempoGame: React.FC<QualiaTempoGameProps> = ({
  onGameAction: _onGameAction,
  isActive = false,
}) => {
  const coordinateSystemService = useCoordinateSystemService();
  const configurationService = useConfiguration();
  const gameInputControllerService = useGameInputControllerService();

  // Get gameplay configuration
  const gameplayConfig = configurationService.getConfigSection('gameplay');

  // Get real game state from Zustand store
  const zustandState = useGameStore();

  // Ref to access the player's 3D avatar for follower positioning
  const playerAvatarRef = useRef<THREE.Group>(null);

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

  // Initialize input handling when component mounts
  useEffect(() => {
    if (!isActive) return;

    // Initialize the GameInputControllerService for input handling
    gameInputControllerService.initializeInputHandling(isActive);

    // Cleanup when component unmounts or becomes inactive
    return () => {
      gameInputControllerService.cleanupInputHandling();
    };
  }, [isActive, gameInputControllerService]);

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-10">
      {/* 3D Game Scene */}
      <Canvas
        data-testid="canvas"
        camera={{ position: [0, 18, 0.1], fov: 50 }}
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
          ref={playerAvatarRef}
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
            id: "chaos_boss_1",
            name: "Entropy Entity",
            position: [0, 2, 0],
            power_level: Math.min(200, zustandState.qualiaState.chaos * 200),
            phase: Math.floor(zustandState.qualiaState.chaos * 3) + 1,
            stress_level: zustandState.qualiaState.intensity,
            qualia_state: {
              consciousness_density: zustandState.qualiaState.precision,
              emotional_valence: 1 - zustandState.qualiaState.recovery, // Inverse of player
              arousal: zustandState.qualiaState.chaos,
              coherence: 1 - zustandState.qualiaState.precision, // Chaos vs order
            }
          }}
        />        <MusicalNotesRenderer
          notes={renderedNotes} // QUALIA.CODE: Real notes from memoized transformation
          currentTime={zustandState.currentTime}
        />

        {/* Game Grid - The core playfield with configuration-driven parameters */}
        <ConfigurableGridRenderer
          playerPosition={{
            x: zustandState.player.position.x,
            y: zustandState.player.position.y
          }}
          activePositions={[]}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />

        {/* QUALIA.CODE v1.1: PlayerAvatar ELIMINATED - Only 3D PlayerRenderer remains */}
        {/* The 2D PlayerAvatar component has been completely removed to eliminate the double avatar issue */}

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

      {/* QUALIA.CODE v1.1: PlayerAvatar moved inside Canvas - this eliminates magic numbers */}

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
