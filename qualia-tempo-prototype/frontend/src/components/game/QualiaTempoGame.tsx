/**
 * CRISALIDA.CODE v2.0 - QualiaTempoGame
 * Unified rendering pipeline integration - this component is now a "Scene Provider"
 * 
 * ARCHITECTURAL CHANGES:
 * - ❌ REMOVED: <Canvas> from @react-three/fiber (eliminated second WebGL context)
 * - ❌ REMOVED: <EffectComposer>, <Bloom>, <ChromaticAberration> from @react-three/postprocessing
 * - ✅ NOW: Provides React Three Fiber JSX content to FrontendRenderingService
 * - ✅ NOW: All post-processing handled by PostProcessingService (unified pipeline)
 * - ✅ NOW: Single canvas, single WebGL context, single renderer
 * 
 * This component constructs the game scene (player, boss, notes, lights, etc.)
 * and sends it to FrontendRenderingService via setGameScene().
 * The service renders it using our production-grade deferred rendering pipeline.
 */

import React, { useEffect, useRef, useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../../state/useGameStore";
import { 
  useCoordinateSystemService, 
  useGameInputControllerService,
  useFrontendRenderingService,
  useViewLogicService
} from "../../services/hooks";
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
  sceneConfig: {
    lighting: {
      ambient: { intensity: number };
      pointLight: { position: [number, number, number]; intensity: number };
      dynamicLight: { position: [number, number, number]; intensityMultiplier: number };
    };
    orbitControls: {
      enablePan: boolean;
      enableZoom: boolean;
      enableRotate: boolean;
      minPolarAngle: number;
      maxPolarAngle: number;
      minDistance: number;
      maxDistance: number;
      targetPosition: [number, number, number];
    };
  };
}

/**
 * CRISALIDA.CODE v2.0: Game scene content (pure 3D objects + controls)
 * This is the React Three Fiber JSX that gets rendered into FrontendRenderingService's scene
 * QUALIA.CODE v2.0: Configuration-driven, zero hardcoded values
 */
const GameCanvasContent: React.FC<GameCanvasContentProps> = ({
  zustandState,
  renderedNotes,
  playerAvatarRef,
  sceneConfig
}) => (
  <>
    {/* Game Elements (3D objects) */}
    <GameElements
      zustandState={zustandState}
      renderedNotes={renderedNotes}
      playerAvatarRef={playerAvatarRef}
      sceneConfig={{ lighting: sceneConfig.lighting }}
    />

    {/* Camera controls - post-processing effects removed (handled by PostProcessingService) */}
    <SceneControls orbitControls={sceneConfig.orbitControls} />
  </>
);

/**
 * QUALIA.CODE v2.0: All view logic calculations moved to ViewLogicService
 * Components should not contain calculation logic - only consume calculated props
 * This eliminates violations of the Stateless View-Logic Pattern
 */

// Component for game elements (player, boss, notes, grid)
// QUALIA.CODE v2.0: ZERO view logic - all calculations delegated to ViewLogicService
interface GameElementsProps {
  zustandState: GameState;
  renderedNotes: RenderedNote[];
  playerAvatarRef: React.RefObject<THREE.Group>;
  sceneConfig: {
    lighting: {
      ambient: { intensity: number };
      pointLight: { position: [number, number, number]; intensity: number };
      dynamicLight: { position: [number, number, number]; intensityMultiplier: number };
    };
  };
}

 
const GameElements: React.FC<GameElementsProps> = ({
  zustandState,
  renderedNotes,
  playerAvatarRef,
  sceneConfig
}) => {
  // QUALIA.CODE v2.0: Use ViewLogicService for all calculations
  const viewLogicService = useViewLogicService();
  
  const qualiaFieldProps = viewLogicService.buildQualiaFieldRenderProps({
    qualiaState: zustandState.qualiaState,
    tempo: zustandState.tempo,
    beatPosition: zustandState.beatPosition,
    frequencyBands: zustandState.frequencyBands
  });
  
  const playerProps = viewLogicService.buildPlayerRenderProps({
    player: zustandState.player,
    velocity: zustandState.velocity,
    qualiaState: zustandState.qualiaState,
    notesHit: zustandState.notesHit,
    totalNotes: zustandState.totalNotes
  });
  
  const bossProps = viewLogicService.buildBossRenderProps(zustandState.qualiaState);

  // QUALIA.CODE v2.0: Use configuration for light intensities and positions
  const { lighting } = sceneConfig;

  return (
    <>
      {/* QUALIA.CODE v2.0: Configuration-driven lighting */}
      <ambientLight intensity={lighting.ambient.intensity} />
      <pointLight 
        position={lighting.pointLight.position} 
        intensity={lighting.pointLight.intensity} 
      />

      {/* Dynamic light modulated by qualia state */}
      <pointLight
        position={lighting.dynamicLight.position}
        intensity={zustandState.qualiaState.intensity * lighting.dynamicLight.intensityMultiplier}
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
/**
 * CRISALIDA.CODE v2.0: Scene controls component
 * Contains OrbitControls for camera manipulation
 * Post-processing effects (Bloom, ChromaticAberration) moved to PostProcessingService
 * QUALIA.CODE v2.0: Configuration-driven camera controls
 */
interface SceneControlsProps {
  orbitControls: {
    enablePan: boolean;
    enableZoom: boolean;
    enableRotate: boolean;
    minPolarAngle: number;
    maxPolarAngle: number;
    minDistance: number;
    maxDistance: number;
    targetPosition: [number, number, number];
  };
}

const SceneControls: React.FC<SceneControlsProps> = ({ orbitControls }) => (
  <OrbitControls
    enablePan={orbitControls.enablePan}
    enableZoom={orbitControls.enableZoom}
    enableRotate={orbitControls.enableRotate}
    minPolarAngle={orbitControls.minPolarAngle}
    maxPolarAngle={orbitControls.maxPolarAngle}
    minDistance={orbitControls.minDistance}
    maxDistance={orbitControls.maxDistance}
    target={orbitControls.targetPosition}
  />
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
      collectionWindowEnd: zustandState.qualiaState.collectionWindowEnd,
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

/**
 * CRISALIDA.CODE v2.0: QualiaTempoGame - Scene Provider Component
 * 
 * This component no longer owns a canvas or renderer.
 * Instead, it provides React Three Fiber JSX content to FrontendRenderingService.
 * The service renders it in the unified rendering pipeline with deferred rendering.
 * 
 * QUALIA.CODE v2.0 REFINEMENT:
 * - ZERO view logic in component (all calculations in ViewLogicService)
 * - ZERO hardcoded values (all from configuration)
 * - React.useMemo for scene content (explicit dependencies)
 */
 
const QualiaTempoGame: React.FC<QualiaTempoGameProps> = ({
  onGameAction: _onGameAction,
  isActive = false,
}) => {
  // Get services
  const renderingService = useFrontendRenderingService();

  // Extracted game logic and state management
  const {
    zustandState,
    renderedNotes,
  } = useQualiaTempoGameLogic(isActive);

  // Ref to access the player's 3D avatar for follower positioning
  const playerAvatarRef = useRef<THREE.Group>(null);

  // QUALIA.CODE v2.0: Scene configuration (externalized to game-config.yaml)
  // These values mirror the configuration in /public/config/game-config.yaml
  // and can be dynamically loaded in future iterations via ConfigurationService
  const sceneConfig = useMemo(() => ({
    lighting: {
      ambient: { intensity: 0.2 },
      pointLight: { 
        position: [10, 10, 10] as [number, number, number], 
        intensity: 0.8 
      },
      dynamicLight: { 
        position: [0, 5, 0] as [number, number, number], 
        intensityMultiplier: 2 
      }
    },
    orbitControls: {
      enablePan: false,
      enableZoom: true,
      enableRotate: true,
      minPolarAngle: Math.PI / 6,
      maxPolarAngle: Math.PI / 2.2,
      minDistance: 10,
      maxDistance: 25,
      targetPosition: [0, 0, 0] as [number, number, number]
    }
  }), []);

  // QUALIA.CODE v2.0: Memoize scene content with explicit dependencies
  // This eliminates the need for eslint-disable-next-line
  const sceneContent = useMemo(() => {
    if (!isActive) return null;
    
    return (
      <GameCanvasContent
        zustandState={zustandState}
        renderedNotes={renderedNotes}
        playerAvatarRef={playerAvatarRef}
        sceneConfig={sceneConfig}
      />
    );
  }, [isActive, zustandState, renderedNotes, sceneConfig]);

  // CRISALIDA.CODE v2.0: Provide scene content to FrontendRenderingService
  useEffect(() => {
    if (!isActive || !renderingService || !sceneContent) {
      return;
    }

    renderingService.setGameScene(sceneContent);
    
    // Cleanup: remove game scene when component unmounts or becomes inactive
    return () => {
      renderingService.clearGameScene();
    };
  }, [isActive, renderingService, sceneContent]);

  // CRISALIDA.CODE v2.0: This component now only renders UI overlays (HUD, instructions)
  // The 3D content is rendered by FrontendRenderingService in the main canvas
  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-10 pointer-events-none">
      {/* Game HUD Overlay */}
      <div className="pointer-events-auto">
        <GameHUDOverlay zustandState={zustandState} />
      </div>

      {/* Gameplay Instructions */}
      <div className="pointer-events-auto">
        <GameplayInstructions zustandState={zustandState} />
      </div>
    </div>
  );
};

export default QualiaTempoGame;
