import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from "../../services/hooks";
import { BossVisualData } from "../../services/contracts/IViewLogicService.contracts";

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
  // QUALIA.CODE v1.1: Service injection for business logic separation
  const viewLogicService = useViewLogicService();
  
  const bossGroupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const tentaclesRef = useRef<THREE.Group>(null);
  
  // Store current visual state for JSX rendering
  const [currentVisuals, setCurrentVisuals] = useState<BossVisualData | null>(null);
  
  // Get default visuals if no current state available
  const visuals = currentVisuals || viewLogicService.getBossVisuals(boss, 0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // QUALIA.CODE v1.1: Business logic extracted to ViewLogicService
    const bossVisuals = viewLogicService.getBossVisuals(boss, time);
    
    // Store visual data for JSX rendering
    setCurrentVisuals(bossVisuals);

    // Apply calculated visual properties to Three.js objects
    if (bossGroupRef.current) {
      bossGroupRef.current.position.set(...bossVisuals.position);
      bossGroupRef.current.scale.set(...bossVisuals.scale);
      bossGroupRef.current.rotation.x += bossVisuals.rotation[0];
      bossGroupRef.current.rotation.y += bossVisuals.rotation[1];
      bossGroupRef.current.rotation.z += bossVisuals.rotation[2];
    }

    // Apply core visual properties
    if (coreMeshRef.current) {
      coreMeshRef.current.scale.setScalar(bossVisuals.core.scale);
      coreMeshRef.current.rotation.set(...bossVisuals.core.rotation);

      // Update core material properties
      if (coreMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
        coreMeshRef.current.material.color.setRGB(...bossVisuals.core.color);
        coreMeshRef.current.material.emissive.setRGB(...bossVisuals.core.emissiveColor);
      }
    }

    // Apply tentacle visual properties
    if (tentaclesRef.current) {
      tentaclesRef.current.children.forEach((tentacle, index) => {
        const tentacleData = bossVisuals.tentacles[index];
        if (tentacleData) {
          tentacle.rotation.set(...tentacleData.rotation);
          tentacle.scale.setScalar(tentacleData.scale);
        }
      });
    }
  });

  // Generate attack pattern based on phase and timing
  const shouldShowAttack = Math.floor(gameTime) % (4 / boss.phase) < 0.5;

  return (
    <group ref={bossGroupRef} position={boss.position}>
      {/* Main Boss Core */}
      <mesh ref={coreMeshRef}>
        <icosahedronGeometry args={[1.5 + (boss.phase - 1) * 0.3, 2]} />
        <meshPhongMaterial
          color={new THREE.Color(...visuals.core.color)}
          emissive={new THREE.Color(...visuals.core.emissiveColor)}
          shininess={50}
          transparent={true}
          opacity={0.8 + boss.stress_level * 0.2}
        />
      </mesh>

      {/* Boss Appendages/Tentacles */}
      <group ref={tentaclesRef}>
        {[...Array(4 + boss.phase)].map((_, i) => {
          const angle = (i / (4 + boss.phase)) * Math.PI * 2;
          const radius = 2 + boss.phase * 0.5;
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
                    color={new THREE.Color(...visuals.core.color)}
                    emissive={new THREE.Color(...visuals.core.emissiveColor)}
                  />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>

      {/* Phase Indicators */}
      <PhaseIndicator phase={boss.phase} color={new THREE.Color(...visuals.core.color)} />

      {/* Stress Level Visualization */}
      <StressVisualization
        stressLevel={boss.stress_level}
        color={new THREE.Color(...visuals.core.emissiveColor)}
        phase={boss.phase}
      />

      {/* Attack Effects */}
      {shouldShowAttack && (
        <AttackEffect
          phase={boss.phase}
          color={new THREE.Color(...visuals.core.emissiveColor)}
          gameTime={gameTime}
        />
      )}

      {/* Chaos Aura (grows with phase) */}
      <mesh>
        <sphereGeometry args={[3 + boss.phase, 16, 16]} />
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
