import React, { useRef, useImperativeHandle } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCoordinateSystemService } from "../../services/hooks";

interface Player {
  id: string;
  name: string;
  position: [number, number, number];
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
 */
const PlayerRenderer = React.forwardRef<THREE.Group, PlayerRendererProps>(({
  player,
  performance,
}, ref) => {
  const playerMeshRef = useRef<THREE.Group>(null);

  // Expose the player mesh to parent via ref
  useImperativeHandle(ref, () => playerMeshRef.current!, []);
  const auraMeshRef = useRef<THREE.Mesh>(null);
  const powerCoreRef = useRef<THREE.Mesh>(null);
  
  // QUALIA.CODE v1.1: Use CoordinateSystemService for proper grid-to-world transformation
  const coordinateSystemService = useCoordinateSystemService();

  // FIXED: Use the canonical GridRenderer transformation via CoordinateSystemService
  // This eliminates the desynchronization issue between PlayerRenderer and GridRenderer
  const player3DPosition: [number, number, number] = coordinateSystemService.gridToWorld(
    player.position[0], // Grid X coordinate
    player.position[2]  // Grid Z coordinate (player.position[1] was incorrect)
  );

  // Calculate dynamic visual properties based on player state
  const powerLevel = player.power_level / 100; // Normalize to 0-1
  const consciousnessLevel = player.consciousness_level;
  const performanceLevel =
    (performance.accuracy +
      performance.rhythm_sync +
      performance.qualia_coherence) /
    3;

  // Player colors based on qualia state
  const baseColor = new THREE.Color().setHSL(
    player.qualia_state.emotional_valence * 0.8 + 0.1, // Hue based on valence
    0.7 + player.qualia_state.arousal * 0.3, // Saturation based on arousal
    0.4 + player.qualia_state.coherence * 0.4, // Lightness based on coherence
  );

  const auraColor = new THREE.Color().setHSL(
    (player.qualia_state.emotional_valence * 0.8 + 0.3) % 1,
    0.8,
    0.5 + performanceLevel * 0.3,
  );

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate main player mesh
    if (playerMeshRef.current) {
      // Floating animation based on consciousness level
      playerMeshRef.current.position.y =
        player3DPosition[1] + Math.sin(time * 2) * 0.1 * consciousnessLevel;

      // Rotation based on qualia state
      playerMeshRef.current.rotation.y +=
        (player.qualia_state.emotional_valence - 0.5) * 0.005;

      // Scale pulsing based on performance
      const scale = 1 + Math.sin(time * 4) * 0.05 * performanceLevel;
      playerMeshRef.current.scale.setScalar(scale);
    }

    // Animate aura
    if (auraMeshRef.current) {
      // Aura size based on power level and performance
      const auraScale = 1 + powerLevel * 0.5 + performanceLevel * 0.3;
      auraMeshRef.current.scale.setScalar(auraScale);

      // Aura rotation
      auraMeshRef.current.rotation.y += 0.01;
      auraMeshRef.current.rotation.x += Math.sin(time * 0.5) * 0.002;

      // Aura opacity pulsing
      if (auraMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
        auraMeshRef.current.material.opacity =
          0.3 + Math.sin(time * 3) * 0.1 * performanceLevel;
        auraMeshRef.current.material.color = auraColor;
      }
    }

    // Animate power core
    if (powerCoreRef.current) {
      // Core intensity based on power and performance
      const coreIntensity = powerLevel * performanceLevel;
      powerCoreRef.current.scale.setScalar(0.5 + coreIntensity * 0.5);

      // Core rotation
      powerCoreRef.current.rotation.x += 0.03;
      powerCoreRef.current.rotation.y += 0.02;

      // Core color shifting
      if (powerCoreRef.current.material instanceof THREE.MeshStandardMaterial) {
        const coreColor = new THREE.Color().setHSL(
          (player.qualia_state.emotional_valence + time * 0.1) % 1,
          0.9,
          0.6 + coreIntensity * 0.4,
        );
        powerCoreRef.current.material.color = coreColor;
        powerCoreRef.current.material.emissive = coreColor
          .clone()
          .multiplyScalar(0.3);
      }
    }
  });

  return (
    <group ref={playerMeshRef} position={player3DPosition}>
      {/* Main Player Body - RESIZED for proper cell fit */}
      <mesh position={[0, 0.4, 0]}>
        <octahedronGeometry args={[0.4, 1]} />
        <meshPhongMaterial
          color={baseColor}
          emissive={baseColor.clone().multiplyScalar(0.2)}
          shininess={100}
          transparent={true}
          opacity={0.9}
        />
      </mesh>

      {/* Power Core */}
      <mesh ref={powerCoreRef} position={[0, 0.3, 0]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor.clone().multiplyScalar(0.5)}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* Consciousness Aura - RESIZED for proper cell fit */}
      <mesh ref={auraMeshRef}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial
          color={auraColor}
          transparent={true}
          opacity={0.3}
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
          color={auraColor}
          transparent={true}
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Power Level Visualization */}
      {[...Array(Math.floor(powerLevel * 10))].map((_, i) => (
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
            color={baseColor}
            emissive={baseColor.clone().multiplyScalar(0.3)}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
});

export default PlayerRenderer;
