import React, { useEffect, useRef } from "react";
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
import { useCoordinateSystemService, useGameInputControllerService } from "../../services/hooks";
import type { GameState } from "../../state/useGameStore";
import { useCombatNotes } from "../../hooks/useCombatNotes";
import type { RenderedNote } from "../../services/protocol/adapters/CombatNoteAdapter";

import QualiaTempoHUD from "./QualiaTempoHUD";
import QualiaFieldRenderer from "./QualiaFieldRenderer";
import MusicalNotesRenderer from "./MusicalNotesRenderer";
import BossRenderer from "./BossRenderer";
import PlayerRenderer from "./PlayerRenderer";
import GridRenderer from "./GridRenderer";

/**
 * Game action data types for callback communication
 */
type GameActionData =
  | { type: "note_hit"; noteId: string; timing: number; accuracy: number }
  | { type: "note_miss"; noteId: string; expectedTiming: number }
  | { type: "player_move"; position: { x: number; y: number } }
  | { type: "game_start" }
  | { type: "game_pause" }
  | { type: "game_resume" }
  | { type: "game_end"; score: number }
  | Record<string, unknown>; // Fallback for unknown action data

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
  onGameAction?: (_action: string, _data: GameActionData) => void;
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

// Hook to manage QualiaTempoGame state and logic
const useQualiaTempoGameLogic = (isActive: boolean) => {
  const gameInputControllerService = useGameInputControllerService();
  const zustandState = useGameStore();

  // QUALIA.CODE v1.1: Note transformation using useCombatNotes hook
  const renderedNotes = useCombatNotes(zustandState.combatData?.noteMap);

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

  return {
    zustandState,
    renderedNotes,
  };
};

// QUALIA.CODE v1.1: transformCombatNotes function eliminated - moved to CombatNoteAdapter

// Component for 3D Canvas content
interface GameCanvasContentProps {
  zustandState: GameState;
  renderedNotes: RenderedNote[];
  playerAvatarRef: React.RefObject<THREE.Group>;
}

const GameCanvasContent: React.FC<GameCanvasContentProps> = ({
  zustandState,
  renderedNotes,
  playerAvatarRef
}) => (
  <>
    {/* Game Elements */}
    <GameElements
      zustandState={zustandState}
      renderedNotes={renderedNotes}
      playerAvatarRef={playerAvatarRef}
    />

    {/* QUALIA.CODE v1.1: SceneControlsAndEffects component - encapsulates controls and post-processing */}
    <SceneControlsAndEffects qualiaState={zustandState.qualiaState} />
  </>
);

// Helper functions to build prop objects (Extract Method Pattern)
// QUALIA.CODE v2.0: Now using real audio analysis data from AudioAnalysisService
const buildQualiaFieldProps = (qualiaState: GameState['qualiaState'], gameState: GameState) => ({
  qualiaState,
  musicData: {
    tempo: gameState.tempo,
    beat_position: gameState.beatPosition,
    intensity: qualiaState.intensity,
    frequency_bands: gameState.frequencyBands.slice(0, 4), // Use first 4 bands
    order_influence: qualiaState.precision,
    chaos_influence: qualiaState.chaos,
    emotional_valence: qualiaState.recovery,
    harmony: qualiaState.flow,
  }
});

// QUALIA.CODE v2.0: Now using real physics data from PhysicsService
const buildPlayerProps = (zustandState: GameState) => ({
  player: {
    id: "player_1",
    name: "The Demiurge",
    position: [
      zustandState.player.position.x,
      0,
      zustandState.player.position.y,
    ] as [number, number, number],
    velocity: [
      zustandState.velocity.x,
      zustandState.velocity.y,
      zustandState.velocity.z,
    ] as [number, number, number],
    health: zustandState.player.health,
    power_level: zustandState.player.health,
    consciousness_level: zustandState.qualiaState.transcendence,
    qualia_state: {
      emotional_valence: zustandState.qualiaState.recovery,
      arousal: zustandState.qualiaState.intensity,
      coherence: zustandState.qualiaState.precision,
    },
  },
  performance: {
    accuracy: zustandState.notesHit / Math.max(1, zustandState.totalNotes),
    rhythm_score: zustandState.player.score,
    combo_multiplier: zustandState.player.combo,
    rhythm_sync: zustandState.qualiaState.flow,
    qualia_coherence: zustandState.qualiaState.precision,
  }
});

const buildBossProps = (qualiaState: GameState['qualiaState']) => ({
  id: "chaos_boss_1",
  name: "Entropy Entity",
  position: [0, 2, 0] as [number, number, number],
  power_level: Math.min(200, qualiaState.chaos * 200),
  phase: Math.floor(qualiaState.chaos * 3) + 1,
  stress_level: qualiaState.intensity,
  qualia_state: {
    consciousness_density: qualiaState.precision,
    emotional_valence: 1 - qualiaState.recovery,
    arousal: qualiaState.chaos,
    coherence: 1 - qualiaState.precision,
  }
});

// Component for game elements (player, boss, notes, grid)
// ARCHITECTURAL IMPROVEMENT: Extracted prop builders to reduce complexity
// Reduced from 96 lines to ~30 lines (70% reduction)
interface GameElementsProps {
  zustandState: GameState;
  renderedNotes: RenderedNote[];
  playerAvatarRef: React.RefObject<THREE.Group>;
}

const GameElements: React.FC<GameElementsProps> = ({
  zustandState,
  renderedNotes,
  playerAvatarRef
}) => {
  // QUALIA.CODE v2.0: Pass full state to get audio analysis data
  const qualiaFieldProps = buildQualiaFieldProps(zustandState.qualiaState, zustandState);
  const playerProps = buildPlayerProps(zustandState);
  const bossProps = buildBossProps(zustandState.qualiaState);

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />

      <pointLight
        position={[0, 5, 0]}
        intensity={zustandState.qualiaState.intensity * 2}
        color={`hsl(${zustandState.qualiaState.recovery * 360}, 80%, 60%)`}
      />

      <QualiaFieldRenderer {...qualiaFieldProps} />
      <PlayerRenderer ref={playerAvatarRef} {...playerProps} />
      <BossRenderer boss={bossProps} />

      <MusicalNotesRenderer
        notes={renderedNotes}
        currentTime={zustandState.currentTime}
      />

      <ConfigurableGridRenderer
        playerPosition={{
          x: zustandState.player.position.x,
          y: zustandState.player.position.y
        }}
        activePositions={[]}
      />
    </>
  );
};

// Component for scene controls and post-processing
interface SceneControlsAndEffectsProps {
  qualiaState: GameState['qualiaState'];
}

const SceneControlsAndEffects: React.FC<SceneControlsAndEffectsProps> = ({ qualiaState }) => (
  <>
    <OrbitControls
      enablePan={false}
      enableZoom={true}
      enableRotate={true}
      minPolarAngle={Math.PI / 6}  // Limit rotation to prevent flipping
      maxPolarAngle={Math.PI / 2.2}  // Keep view mostly top-down but allow tilt
      minDistance={10}
      maxDistance={25}
      target={[0, 0, 0]}  // Focus on center of grid
    />

    {/* Post-processing effects */}
    <EffectComposer>
      <Bloom
        intensity={qualiaState.intensity * 2}
        luminanceThreshold={0.1}
        luminanceSmoothing={0.9}
      />
      <ChromaticAberration
        offset={new Vector2(qualiaState.chaos * 0.002, 0)}
        radialModulation={false}
        modulationOffset={0.15}
      />
    </EffectComposer>
  </>
);

// Component for Game HUD Overlay
interface GameHUDOverlayProps {
  zustandState: GameState;
}

const GameHUDOverlay: React.FC<GameHUDOverlayProps> = ({ zustandState }) => (
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
);

// Component for Gameplay Instructions
interface GameplayInstructionsProps {
  zustandState: GameState;
}

const GameplayInstructions: React.FC<GameplayInstructionsProps> = ({ zustandState }) => (
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
);

const QualiaTempoGame: React.FC<QualiaTempoGameProps> = ({
  onGameAction: _onGameAction,
  isActive = false,
}) => {
  // Extracted game logic and state management
  const {
    zustandState,
    renderedNotes,
  } = useQualiaTempoGameLogic(isActive);

  // Ref to access the player's 3D avatar for follower positioning
  const playerAvatarRef = useRef<THREE.Group>(null);

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-10">
      {/* 3D Game Scene */}
      <Canvas
        data-testid="canvas"
        camera={{ 
          position: [0, 15, 12], 
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        className="w-full h-full"
        style={{
          background: "linear-gradient(180deg, #0a0a2e 0%, #16213e 100%)",
        }}
      >
        <GameCanvasContent
          zustandState={zustandState}
          renderedNotes={renderedNotes}
          playerAvatarRef={playerAvatarRef}
        />
      </Canvas>

      {/* Game HUD Overlay */}
      <GameHUDOverlay zustandState={zustandState} />

      {/* QUALIA.CODE v1.1: PlayerAvatar moved inside Canvas - this eliminates magic numbers */}

      {/* Gameplay Instructions */}
      <GameplayInstructions zustandState={zustandState} />
    </div>
  );
};

export default QualiaTempoGame;
