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

/**
 * PlayerRenderer - Renders the player character (Demiurge Avatar) with
 * visual effects that respond to performance and qualia state.
 * QUALIA.CODE v1.1: Refactored to follow Stateless View-Logic Pattern
 */
const PlayerRenderer = React.forwardRef<THREE.Group, PlayerRendererProps>(({
  player,
  performance,
}, ref) => {
  // QUALIA.CODE v1.1: Service injection for business logic separation
  const viewLogicService = useViewLogicService();
  
  const playerMeshRef = useRef<THREE.Group>(null);
  const auraMeshRef = useRef<THREE.Mesh>(null);
  const powerCoreRef = useRef<THREE.Mesh>(null);

  // Expose the player mesh to parent via ref
  useImperativeHandle(ref, () => playerMeshRef.current!, []);
  
  // Store current visual state for JSX rendering
  const [currentVisuals, setCurrentVisuals] = useState<PlayerVisualData | null>(null);
  
  // Get default visuals if no current state available
  const visuals = currentVisuals || viewLogicService.getPlayerVisuals(player, performance, 0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // QUALIA.CODE v1.1: Business logic extracted to ViewLogicService
    const playerVisuals = viewLogicService.getPlayerVisuals(player, performance, time);
    
    // Store visual data for JSX rendering
    setCurrentVisuals(playerVisuals);

    // Apply calculated visual properties to Three.js objects
    if (playerMeshRef.current) {
      playerMeshRef.current.position.set(...playerVisuals.position);
      playerMeshRef.current.scale.set(...playerVisuals.scale);
      playerMeshRef.current.rotation.set(...playerVisuals.rotation);
    }

    // Apply aura visual properties
    if (auraMeshRef.current) {
      auraMeshRef.current.scale.setScalar(playerVisuals.aura.scale);
      auraMeshRef.current.rotation.set(...playerVisuals.aura.rotation);

      // Update aura material properties
      if (auraMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
        auraMeshRef.current.material.opacity = playerVisuals.aura.opacity;
        auraMeshRef.current.material.color.setRGB(...playerVisuals.aura.color);
      }
    }

    // Apply power core visual properties
    if (powerCoreRef.current) {
      powerCoreRef.current.scale.setScalar(playerVisuals.powerCore.scale);
      powerCoreRef.current.rotation.set(...playerVisuals.powerCore.rotation);

      // Update core material properties
      if (powerCoreRef.current.material instanceof THREE.MeshStandardMaterial) {
        powerCoreRef.current.material.color.setRGB(...playerVisuals.powerCore.color);
        powerCoreRef.current.material.emissive.setRGB(
          ...playerVisuals.powerCore.color.map(c => c * playerVisuals.powerCore.emissiveIntensity * 0.3) as [number, number, number]
        );
      }
    }
  });

  return (
    <group ref={playerMeshRef} position={visuals.position}>
      {/* Main Player Body - RESIZED for proper cell fit */}
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

      {/* Power Core */}
      <mesh ref={powerCoreRef} position={[0, 0.3, 0]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial
          color={new THREE.Color(...visuals.powerCore.color)}
          emissive={new THREE.Color(...visuals.powerCore.color).multiplyScalar(0.5)}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* Consciousness Aura - RESIZED for proper cell fit */}
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

      {/* Performance Indicators */}
      {/* Accuracy Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry
          args={[1.0, 1.2, 16, 1, 0, Math.PI * 2 * performance.accuracy]}
        />
        <meshBasicMaterial
          color="#4A90E2"
          transparent={true}
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rhythm Sync Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry
          args={[1.3, 1.5, 16, 1, 0, Math.PI * 2 * performance.rhythm_sync]}
        />
        <meshBasicMaterial
          color="#50C878"
          transparent={true}
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Qualia Coherence Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <ringGeometry
          args={[
            1.6,
            1.8,
            16,
            1,
            0,
            Math.PI * 2 * performance.qualia_coherence,
          ]}
        />
        <meshBasicMaterial
          color={new THREE.Color(...visuals.aura.color)}
          transparent={true}
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Power Level Visualization */}
      {[...Array(Math.floor(player.power_level / 10))].map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin((i / 10) * Math.PI * 2) * 2,
            Math.cos(Date.now() * 0.001 + i) * 0.5,
            Math.cos((i / 10) * Math.PI * 2) * 2,
          ]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color={new THREE.Color(...visuals.color)}
            emissive={new THREE.Color(...visuals.color).multiplyScalar(0.3)}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
});

export default PlayerRenderer;
