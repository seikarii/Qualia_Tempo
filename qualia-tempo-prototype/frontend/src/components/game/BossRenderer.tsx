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

// Extract visual application functions
const applyBossGroupVisuals = (
  bossGroupRef: React.RefObject<THREE.Group>,
  bossVisuals: BossVisualData
) => {
  if (bossGroupRef.current) {
    bossGroupRef.current.position.set(...bossVisuals.position);
    bossGroupRef.current.scale.set(...bossVisuals.scale);
    bossGroupRef.current.rotation.set(...bossVisuals.rotation);
  }
};

const applyCoreVisuals = (
  coreMeshRef: React.RefObject<THREE.Mesh>,
  bossVisuals: BossVisualData
) => {
  if (coreMeshRef.current) {
    coreMeshRef.current.scale.setScalar(bossVisuals.core.scale);
    coreMeshRef.current.rotation.set(...bossVisuals.core.rotation);

    // Update core material properties
    if (coreMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
      coreMeshRef.current.material.color.setRGB(...bossVisuals.core.color);
      coreMeshRef.current.material.emissive.setRGB(...bossVisuals.core.emissiveColor);
    }
  }
};

const applyTentacleVisuals = (
  tentaclesRef: React.RefObject<THREE.Group>,
  bossVisuals: BossVisualData
) => {
  if (tentaclesRef.current) {
    tentaclesRef.current.children.forEach((tentacle, index) => {
      const tentacleData = bossVisuals.tentacles[index];
      if (tentacleData) {
        tentacle.rotation.set(...tentacleData.rotation);
        tentacle.scale.setScalar(tentacleData.scale);
      }
    });
  }
};

// Custom hook to manage boss visual updates
const useBossVisualUpdates = (
  boss: Boss,
  viewLogicService: ReturnType<typeof useViewLogicService>
) => {
  const bossGroupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const tentaclesRef = useRef<THREE.Group>(null);
  const [currentVisuals, setCurrentVisuals] = useState<BossVisualData | null>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const bossVisuals = viewLogicService.getBossVisuals(boss, time);

    setCurrentVisuals(bossVisuals);
    applyBossGroupVisuals(bossGroupRef, bossVisuals);
    applyCoreVisuals(coreMeshRef, bossVisuals);
    applyTentacleVisuals(tentaclesRef, bossVisuals);
  });

  const visuals = currentVisuals ?? viewLogicService.getBossVisuals(boss, 0);

  return { bossGroupRef, coreMeshRef, tentaclesRef, visuals };
};

/**
 * BossRenderer - Renders dynamic boss entities with phase-based transformations
 * and attacks. Visual effects reflect boss stress level and qualia state.
 * Designed for memorable, streamable boss encounters.
 */
const BossRenderer: React.FC<BossRendererProps> = ({ boss }) => {
  const viewLogicService = useViewLogicService();
  const { bossGroupRef, coreMeshRef, tentaclesRef, visuals } = useBossVisualUpdates(boss, viewLogicService);

  return (
    <BossRenderContent
      boss={boss}
      visuals={visuals}
      bossGroupRef={bossGroupRef}
      coreMeshRef={coreMeshRef}
      tentaclesRef={tentaclesRef}
    />
  );
};

// Component to render boss visual content
interface BossRenderContentProps {
  boss: Boss;
  visuals: BossVisualData;
  bossGroupRef: React.RefObject<THREE.Group>;
  coreMeshRef: React.RefObject<THREE.Mesh>;
  tentaclesRef: React.RefObject<THREE.Group>;
}

// Component to render boss visual content
interface BossRenderContentProps {
  boss: Boss;
  visuals: BossVisualData;
  bossGroupRef: React.RefObject<THREE.Group>;
  coreMeshRef: React.RefObject<THREE.Mesh>;
  tentaclesRef: React.RefObject<THREE.Group>;
}

const BossRenderContent: React.FC<BossRenderContentProps> = ({
  boss,
  visuals,
  bossGroupRef,
  coreMeshRef,
  tentaclesRef
}) => (
  <group ref={bossGroupRef} position={boss.position}>
    <BossCore boss={boss} visuals={visuals} coreMeshRef={coreMeshRef} />
    <BossTentacles visuals={visuals} tentaclesRef={tentaclesRef} />
    <BossEffects boss={boss} visuals={visuals} />
  </group>
);

// Boss core component
interface BossCoreProps {
  boss: Boss;
  visuals: BossVisualData;
  coreMeshRef: React.RefObject<THREE.Mesh>;
}

const BossCore: React.FC<BossCoreProps> = ({ boss, visuals, coreMeshRef }) => (
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
);

// Boss tentacles component
interface BossTentaclesProps {
  visuals: BossVisualData;
  tentaclesRef: React.RefObject<THREE.Group>;
}

const BossTentacles: React.FC<BossTentaclesProps> = ({ visuals, tentaclesRef }) => (
  <group ref={tentaclesRef}>
    {visuals.tentacles.map((tentacle, i) => (
      <group key={i} position={tentacle.position} rotation={tentacle.rotation} scale={[tentacle.scale, tentacle.scale, tentacle.scale]}>
        {tentacle.segments.map((segment, segmentIndex) => (
          <mesh
            key={segmentIndex}
            position={segment.position}
            rotation={segment.rotation}
            scale={[segment.scale, segment.scale, segment.scale]}
          >
            <cylinderGeometry args={[0.2 - segmentIndex * 0.05, 0.3 - segmentIndex * 0.05, 1, 8]} />
            <meshPhongMaterial
              color={new THREE.Color(...visuals.core.color)}
              emissive={new THREE.Color(...visuals.core.emissiveColor)}
            />
          </mesh>
        ))}
      </group>
    ))}
  </group>
);

// Boss effects component
interface BossEffectsProps {
  boss: Boss;
  visuals: BossVisualData;
}

const BossEffects: React.FC<BossEffectsProps> = ({ boss, visuals }) => (
  <>
    <PhaseIndicator phase={boss.phase} color={new THREE.Color(...visuals.core.color)} />
    <StressVisualization stressLevel={boss.stress_level} color={new THREE.Color(...visuals.core.emissiveColor)} phase={boss.phase} />
    {visuals.shouldShowAttack && <AttackEffect attackWaves={visuals.attackWaves} color={new THREE.Color(...visuals.core.emissiveColor)} />}
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
  </>
);

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

const StressVisualization: React.FC<StressVisualizationProps> = ({ stressLevel, color, phase }) => {
  const intensity = stressLevel * phase;
  return (
    <mesh position={[0, 2, 0]}>
      <sphereGeometry args={[0.5 + intensity * 0.3, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent={true}
        opacity={0.3 + intensity * 0.4}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// Attack effect component
interface AttackEffectProps {
  attackWaves: Array<{ position: [number, number, number]; scale: number; opacity: number }>;
  color: THREE.Color;
}

const AttackEffect: React.FC<AttackEffectProps> = ({ attackWaves, color }) => {
  return (
    <group>
      {attackWaves.map((wave, i) => (
        <mesh key={i} position={wave.position} scale={[wave.scale, wave.scale, wave.scale]}>
          <ringGeometry args={[0.5, 1, 16]} />
          <meshBasicMaterial
            color={color}
            transparent={true}
            opacity={wave.opacity}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

export default BossRenderer;
