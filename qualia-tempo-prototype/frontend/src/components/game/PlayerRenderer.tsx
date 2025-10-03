import React, { useRef, useImperativeHandle, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from "../../services/hooks";
import { PlayerVisualData } from "../../services/contracts/IViewLogicService.contracts";

interface Player {
  id: string;
  name: string;
  position: [number, number, number];
  velocity: [number, number, number];
  health: number;
  power_level: number;
  consciousness_level: number;
  qualia_state: {
    emotional_valence: number;
    arousal: number;
    coherence: number;
  };
}

interface Performance {
  accuracy: number;
  rhythm_score: number;
  combo_multiplier: number;
  rhythm_sync: number;
  qualia_coherence: number;
}

interface PlayerRendererProps {
  player: Player;
  performance: Performance;
}

// Extract visual application functions
const applyPlayerMeshVisuals = (
  playerMeshRef: React.RefObject<THREE.Group>,
  playerVisuals: PlayerVisualData
) => {
  if (playerMeshRef.current) {
    playerMeshRef.current.position.set(...playerVisuals.position);
    playerMeshRef.current.scale.set(...playerVisuals.scale);
    playerMeshRef.current.rotation.set(...playerVisuals.rotation);
  }
};

const applyAuraVisuals = (
  auraMeshRef: React.RefObject<THREE.Mesh>,
  playerVisuals: PlayerVisualData
) => {
  if (auraMeshRef.current) {
    auraMeshRef.current.scale.setScalar(playerVisuals.aura.scale);
    auraMeshRef.current.rotation.set(...playerVisuals.aura.rotation);

    if (auraMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
      auraMeshRef.current.material.opacity = playerVisuals.aura.opacity;
      auraMeshRef.current.material.color.setRGB(...playerVisuals.aura.color);
    }
  }
};

const applyPowerCoreVisuals = (
  powerCoreRef: React.RefObject<THREE.Mesh>,
  playerVisuals: PlayerVisualData
) => {
  if (powerCoreRef.current) {
    powerCoreRef.current.scale.setScalar(playerVisuals.powerCore.scale);
    powerCoreRef.current.rotation.set(...playerVisuals.powerCore.rotation);

    if (powerCoreRef.current.material instanceof THREE.MeshStandardMaterial) {
      powerCoreRef.current.material.color.setRGB(...playerVisuals.powerCore.color);
      powerCoreRef.current.material.emissive.setRGB(
        ...playerVisuals.powerCore.color.map(c => c * playerVisuals.powerCore.emissiveIntensity * 0.3) as [number, number, number]
      );
    }
  }
};

// Custom hook to manage player visual updates
const usePlayerVisualUpdates = (
  player: Player,
  performance: Performance,
  viewLogicService: ReturnType<typeof useViewLogicService>
) => {
  const playerMeshRef = useRef<THREE.Group>(null);
  const auraMeshRef = useRef<THREE.Mesh>(null);
  const powerCoreRef = useRef<THREE.Mesh>(null);
  const [currentVisuals, setCurrentVisuals] = useState<PlayerVisualData | null>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const playerVisuals = viewLogicService.getPlayerVisuals(player, performance, time);

    setCurrentVisuals(playerVisuals);
    applyPlayerMeshVisuals(playerMeshRef, playerVisuals);
    applyAuraVisuals(auraMeshRef, playerVisuals);
    applyPowerCoreVisuals(powerCoreRef, playerVisuals);
  });

  const visuals = currentVisuals ?? viewLogicService.getPlayerVisuals(player, performance, 0);

  return { playerMeshRef, auraMeshRef, powerCoreRef, visuals };
};

/**
 * PlayerRenderer - Renders the player character (Demiurge Avatar) with
 * visual effects that respond to performance and qualia state.
 * QUALIA.CODE v1.1: Refactored to follow Stateless View-Logic Pattern
 */
const PlayerRenderer = React.forwardRef<THREE.Group, PlayerRendererProps>(({
  player,
  performance,
}, ref) => {
  const viewLogicService = useViewLogicService();
  const { playerMeshRef, auraMeshRef, powerCoreRef, visuals } = usePlayerVisualUpdates(player, performance, viewLogicService);

  // Expose the player mesh to parent via ref
  useImperativeHandle(ref, () => {
    if (playerMeshRef.current) {
      return playerMeshRef.current;
    }
    throw new Error('Player mesh not initialized');
  }, [playerMeshRef]);

  return (
        <PlayerRenderContent
      performance={performance}
      visuals={visuals}
      playerMeshRef={playerMeshRef}
      auraMeshRef={auraMeshRef}
      powerCoreRef={powerCoreRef}
    />
  );
});

// Component to render player visual content
interface PlayerRenderContentProps {
  performance: Performance;
  visuals: PlayerVisualData;
  playerMeshRef: React.RefObject<THREE.Group>;
  auraMeshRef: React.RefObject<THREE.Mesh>;
  powerCoreRef: React.RefObject<THREE.Mesh>;
}

const PlayerRenderContent: React.FC<PlayerRenderContentProps> = ({
  performance,
  visuals,
  playerMeshRef,
  auraMeshRef,
  powerCoreRef
}) => (
  <group ref={playerMeshRef} position={visuals.position}>
    <PlayerBody visuals={visuals} />
    <PlayerPowerCore visuals={visuals} powerCoreRef={powerCoreRef} />
    <PlayerAura visuals={visuals} auraMeshRef={auraMeshRef} />
    <PlayerEffects performance={performance} />
  </group>
);

// Player body component
interface PlayerBodyProps {
  visuals: PlayerVisualData;
}

const PlayerBody: React.FC<PlayerBodyProps> = ({ visuals }) => (
  <mesh position={[0, 0.4, 0]}>
    <octahedronGeometry args={[0.4, 1]} />
    <meshPhongMaterial
      color={new THREE.Color(...visuals.color)}
      emissive={new THREE.Color(...visuals.color).multiplyScalar(0.2)}
      shininess={100}
      transparent={true}
      opacity={0.9}
    />
  </mesh>
);

// Player power core component
interface PlayerPowerCoreProps {
  visuals: PlayerVisualData;
  powerCoreRef: React.RefObject<THREE.Mesh>;
}

const PlayerPowerCore: React.FC<PlayerPowerCoreProps> = ({ visuals, powerCoreRef }) => (
  <mesh ref={powerCoreRef} position={[0, 0.3, 0]}>
    <icosahedronGeometry args={[0.3, 1]} />
    <meshStandardMaterial
      color={new THREE.Color(...visuals.powerCore.color)}
      emissive={new THREE.Color(...visuals.powerCore.color).multiplyScalar(0.5)}
      transparent={true}
      opacity={0.8}
    />
  </mesh>
);

// Player aura component
interface PlayerAuraProps {
  visuals: PlayerVisualData;
  auraMeshRef: React.RefObject<THREE.Mesh>;
}

const PlayerAura: React.FC<PlayerAuraProps> = ({ visuals, auraMeshRef }) => (
  <mesh ref={auraMeshRef}>
    <sphereGeometry args={[0.7, 16, 16]} />
    <meshBasicMaterial
      color={new THREE.Color(...visuals.aura.color)}
      transparent={true}
      opacity={visuals.aura.opacity}
      blending={THREE.AdditiveBlending}
      side={THREE.BackSide}
    />
  </mesh>
);

// Player effects component
interface PlayerEffectsProps {
  performance: Performance;
}

const PlayerEffects: React.FC<PlayerEffectsProps> = ({ performance }) => (
  <>
    {/* Accuracy Ring */}
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <ringGeometry args={[1.0, 1.2, 16, 1, 0, Math.PI * 2 * performance.accuracy]} />
      <meshBasicMaterial color="#00ff00" transparent={true} opacity={0.6} />
    </mesh>

    {/* Rhythm Score Indicator */}
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
      <ringGeometry args={[1.3, 1.5, 16, 1, 0, Math.PI * 2 * performance.rhythm_score]} />
      <meshBasicMaterial color="#ff6600" transparent={true} opacity={0.6} />
    </mesh>

    {/* Combo Multiplier Glow */}
    {performance.combo_multiplier > 1 && (
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8 + performance.combo_multiplier * 0.1, 16, 16]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent={true}
          opacity={0.2 + performance.combo_multiplier * 0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    )}
  </>
);

PlayerRenderer.displayName = 'PlayerRenderer';

export default PlayerRenderer;
