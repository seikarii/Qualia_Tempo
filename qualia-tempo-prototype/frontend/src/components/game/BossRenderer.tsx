import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Boss {
  id: string;
  name: string;
  position: [number, number, number];
  power_level: number;
  phase: number;
  stress_level: number;
  qualia_state: {
    consciousness_density: number;
    emotional_valence: number;
    arousal: number;
    coherence: number;
  };
}

interface BossRendererProps {
  boss: Boss;
  gameTime: number;
}

/**
 * BossRenderer - Renders dynamic boss entities with phase-based transformations
 * and attacks. Visual effects reflect boss stress level and qualia state.
 * Designed for memorable, streamable boss encounters.
 */
const BossRenderer: React.FC<BossRendererProps> = ({ boss, gameTime }) => {
  const bossGroupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const tentaclesRef = useRef<THREE.Group>(null);

  // Calculate boss visual properties
  const powerRatio = boss.power_level / 200; // Assuming max 200
  const stressIntensity = boss.stress_level;
  const phaseMultiplier = boss.phase;

  // Boss color based on qualia state and stress
  const bossColor = new THREE.Color().setHSL(
    (boss.qualia_state.emotional_valence + 1) * 0.15, // Red-ish hue for negative valence
    0.8 + stressIntensity * 0.2,
    0.3 + (1 - stressIntensity) * 0.4,
  );

  const stressColor = new THREE.Color().setHSL(
    0,
    1,
    0.5 + stressIntensity * 0.3,
  );

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Main boss movement and rotation
    if (bossGroupRef.current) {
      // Phase-based movement patterns
      if (boss.phase === 1) {
        // Slow, menacing movement
        bossGroupRef.current.position.y =
          boss.position[1] + Math.sin(time * 0.5) * 0.3;
        bossGroupRef.current.rotation.y += 0.005;
      } else if (boss.phase === 2) {
        // More aggressive movement
        bossGroupRef.current.position.y =
          boss.position[1] + Math.sin(time * 1.5) * 0.5;
        bossGroupRef.current.position.x =
          boss.position[0] + Math.cos(time * 0.8) * 0.5;
        bossGroupRef.current.rotation.y += 0.01;
        bossGroupRef.current.rotation.z += Math.sin(time) * 0.01;
      } else {
        // Chaotic final phase movement
        bossGroupRef.current.position.y =
          boss.position[1] + Math.sin(time * 3) * 0.8;
        bossGroupRef.current.position.x =
          boss.position[0] + Math.cos(time * 2.1) * 1.0;
        bossGroupRef.current.rotation.y += 0.02;
        bossGroupRef.current.rotation.x += Math.sin(time * 1.3) * 0.02;
      }

      // Scale based on stress level (boss grows when stressed)
      const stressScale = 1 + stressIntensity * 0.3;
      bossGroupRef.current.scale.setScalar(stressScale);
    }

    // Animate core
    if (coreMeshRef.current) {
      // Core pulsing based on power and stress
      const pulseScale =
        1 + Math.sin(time * 4 * phaseMultiplier) * 0.2 * stressIntensity;
      coreMeshRef.current.scale.setScalar(pulseScale);

      // Core rotation
      coreMeshRef.current.rotation.x += 0.02 * phaseMultiplier;
      coreMeshRef.current.rotation.y += 0.015 * phaseMultiplier;

      // Update core color based on stress
      if (coreMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
        coreMeshRef.current.material.color = stressColor;
        coreMeshRef.current.material.emissive = stressColor
          .clone()
          .multiplyScalar(stressIntensity);
      }
    }

    // Animate tentacles/appendages
    if (tentaclesRef.current) {
      tentaclesRef.current.children.forEach((tentacle, index) => {
        const tentacleTime = time + index * 0.5;
        tentacle.rotation.y += Math.sin(tentacleTime) * 0.01 * stressIntensity;
        tentacle.rotation.z +=
          Math.cos(tentacleTime * 1.2) * 0.015 * stressIntensity;

        // Scale tentacles based on phase
        const tentacleScale = 0.8 + phaseMultiplier * 0.3;
        tentacle.scale.setScalar(tentacleScale);
      });
    }
  });

  // Generate attack pattern based on phase and timing
  const shouldShowAttack = Math.floor(gameTime) % (4 / boss.phase) < 0.5;

  return (
    <group ref={bossGroupRef} position={boss.position}>
      {/* Main Boss Core */}
      <mesh ref={coreMeshRef}>
        <icosahedronGeometry args={[1.5 + phaseMultiplier * 0.3, 2]} />
        <meshPhongMaterial
          color={bossColor}
          emissive={bossColor.clone().multiplyScalar(0.3)}
          shininess={50}
          transparent={true}
          opacity={0.8 + stressIntensity * 0.2}
        />
      </mesh>

      {/* Boss Appendages/Tentacles */}
      <group ref={tentaclesRef}>
        {[...Array(4 + boss.phase)].map((_, i) => {
          const angle = (i / (4 + boss.phase)) * Math.PI * 2;
          const radius = 2 + phaseMultiplier * 0.5;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;

          return (
            <group key={i} position={[x, 0, z]} rotation={[0, angle, 0]}>
              {/* Tentacle segments */}
              {[...Array(3)].map((_, segmentIndex) => (
                <mesh
                  key={segmentIndex}
                  position={[0, -segmentIndex * 0.5, segmentIndex * 0.3]}
                >
                  <cylinderGeometry
                    args={[
                      0.2 - segmentIndex * 0.05,
                      0.3 - segmentIndex * 0.05,
                      1,
                      8,
                    ]}
                  />
                  <meshPhongMaterial
                    color={bossColor.clone().lerp(stressColor, stressIntensity)}
                    emissive={stressColor.clone().multiplyScalar(0.2)}
                  />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>

      {/* Phase Indicators */}
      <PhaseIndicator phase={boss.phase} color={bossColor} />

      {/* Stress Level Visualization */}
      <StressVisualization
        stressLevel={boss.stress_level}
        color={stressColor}
        phase={boss.phase}
      />

      {/* Attack Effects */}
      {shouldShowAttack && (
        <AttackEffect
          phase={boss.phase}
          color={stressColor}
          gameTime={gameTime}
        />
      )}

      {/* Chaos Aura (grows with phase) */}
      <mesh>
        <sphereGeometry args={[3 + phaseMultiplier, 16, 16]} />
        <meshBasicMaterial
          color={bossColor}
          transparent={true}
          opacity={0.1 + stressIntensity * 0.2}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Power Level Particles */}
      {[...Array(Math.floor(powerRatio * 20))].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 4 + Math.sin(gameTime + i) * 0.5;
        const height = Math.cos(gameTime * 0.5 + i) * 2;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshStandardMaterial
              color={stressColor}
              emissive={stressColor.clone().multiplyScalar(0.5)}
              transparent={true}
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Phase indicator component
interface PhaseIndicatorProps {
  phase: number;
  color: THREE.Color;
}

const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({ phase, color }) => {
  return (
    <group position={[0, 3, 0]}>
      {[...Array(phase)].map((_, i) => (
        <mesh key={i} position={[i * 0.5 - (phase - 1) * 0.25, 0, 0]}>
          <octahedronGeometry args={[0.2]} />
          <meshStandardMaterial
            color={color}
            emissive={color.clone().multiplyScalar(0.5)}
          />
        </mesh>
      ))}
    </group>
  );
};

// Stress level visualization
interface StressVisualizationProps {
  stressLevel: number;
  color: THREE.Color;
  phase: number;
}

const StressVisualization: React.FC<StressVisualizationProps> = ({
  stressLevel,
  color,
  phase: _phase,
}) => {
  const stressRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (stressRef.current) {
      const time = state.clock.getElapsedTime();
      stressRef.current.rotation.y += 0.02 * stressLevel;

      // Erratic movement when highly stressed
      if (stressLevel > 0.7) {
        stressRef.current.position.x = Math.sin(time * 10) * 0.1;
        stressRef.current.position.z = Math.cos(time * 12) * 0.1;
      }
    }
  });

  return (
    <group ref={stressRef}>
      {/* Stress rings */}
      {[...Array(Math.floor(stressLevel * 5))].map((_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, i * 0.3, 0]}>
          <ringGeometry args={[2 + i * 0.5, 2.5 + i * 0.5, 16]} />
          <meshBasicMaterial
            color={color}
            transparent={true}
            opacity={0.3 - i * 0.05}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

// Attack effect component
interface AttackEffectProps {
  phase: number;
  color: THREE.Color;
  gameTime: number;
}

const AttackEffect: React.FC<AttackEffectProps> = ({
  phase,
  color,
  gameTime,
}) => {
  const attackRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (attackRef.current) {
      const time = state.clock.getElapsedTime();

      // Different attack patterns per phase
      if (phase === 1) {
        // Simple rotation
        attackRef.current.rotation.y += 0.05;
      } else if (phase === 2) {
        // Dual axis rotation
        attackRef.current.rotation.y += 0.08;
        attackRef.current.rotation.x += 0.03;
      } else {
        // Chaotic rotation
        attackRef.current.rotation.y += Math.sin(time * 2) * 0.1;
        attackRef.current.rotation.x += Math.cos(time * 1.7) * 0.08;
        attackRef.current.rotation.z += Math.sin(time * 2.3) * 0.05;
      }
    }
  });

  return (
    <group ref={attackRef}>
      {/* Attack waves */}
      {[...Array(phase * 2)].map((_, i) => {
        const angle = (i / (phase * 2)) * Math.PI * 2;
        const radius = 5 + Math.sin(gameTime * 2 + i) * 2;

        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
          >
            <coneGeometry args={[0.5, 2, 8]} />
            <meshStandardMaterial
              color={color}
              emissive={color.clone().multiplyScalar(0.7)}
              transparent={true}
              opacity={0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default BossRenderer;
