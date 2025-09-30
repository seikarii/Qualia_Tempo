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
}

/**
 * BossRenderer - Renders dynamic boss entities with phase-based transformations
 * and attacks. Visual effects reflect boss stress level and qualia state.
 * Designed for memorable, streamable boss encounters.
 */
const BossRenderer: React.FC<BossRendererProps> = ({ boss }) => {
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
      bossGroupRef.current.rotation.set(...bossVisuals.rotation);
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
        {visuals.tentacles.map((tentacle, i) => (
          <group key={i} position={tentacle.position} rotation={tentacle.rotation} scale={[tentacle.scale, tentacle.scale, tentacle.scale]}>
            {/* Tentacle segments */}
            {tentacle.segments.map((segment, segmentIndex) => (
              <mesh
                key={segmentIndex}
                position={segment.position}
                rotation={segment.rotation}
                scale={[segment.scale, segment.scale, segment.scale]}
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
        ))}
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
      {visuals.shouldShowAttack && (
        <AttackEffect
          attackWaves={visuals.attackWaves}
          color={new THREE.Color(...visuals.core.emissiveColor)}
        />
      )}

      {/* Chaos Aura (grows with phase) */}
      <mesh scale={[visuals.chaosAura.scale, visuals.chaosAura.scale, visuals.chaosAura.scale]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(...visuals.chaosAura.color)}
          transparent={true}
          opacity={visuals.chaosAura.opacity}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Power Level Particles */}
      {visuals.powerParticles.map((particle, i) => (
        <mesh key={i} position={particle.position} scale={[particle.scale, particle.scale, particle.scale]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={new THREE.Color(...visuals.core.emissiveColor)}
            emissive={new THREE.Color(...visuals.core.emissiveColor).multiplyScalar(0.5)}
            transparent={true}
            opacity={particle.opacity}
          />
        </mesh>
      ))}
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
  attackWaves: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    opacity: number;
  }>;
  color: THREE.Color;
}

const AttackEffect: React.FC<AttackEffectProps> = ({
  attackWaves,
  color,
}) => {
  const attackRef = useRef<THREE.Group>(null);

  // Apply the calculated rotation from ViewLogicService
  useFrame(() => {
    if (attackRef.current && attackWaves.length > 0) {
      // Use the rotation from the first attack wave as the group rotation
      attackRef.current.rotation.set(...attackWaves[0].rotation);
    }
  });

  return (
    <group ref={attackRef}>
      {/* Attack waves */}
      {attackWaves.map((wave, i) => (
        <mesh
          key={i}
          position={wave.position}
          rotation={wave.rotation}
          scale={[wave.scale, wave.scale, wave.scale]}
        >
          <coneGeometry args={[0.5, 2, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color.clone().multiplyScalar(0.7)}
            transparent={true}
            opacity={wave.opacity}
          />
        </mesh>
      ))}
    </group>
  );
};

export default BossRenderer;
