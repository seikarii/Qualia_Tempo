import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import EntityInfoCard from './EntityInfoCard';
import * as THREE from 'three';
import type {
  PredictiveEntityState,
  WebSocketState,
  InterpretedVisualReality,
  CollapsePatternParticle,
  InteractionField,
} from '../core/types';
import OntologicalInterpreter from '../core/OntologicalInterpreter';
import { createOntologicalShader } from '../shaders/OntologicalParticleShader';

/**
 * Calcula el campo de interacción entre una entidad y sus cercanas.
 * Incluye lógica avanzada para fuerza, tipo y radios de interacción.
 */
const calculateInteractionField = (
  sourceEntity: PredictiveEntityState,
  nearbyEntities: PredictiveEntityState[]
): InteractionField => {
  const totalStrength = nearbyEntities.reduce(
    (sum, e) => sum + e.qualia_state.emotional_valence * e.interactionPotential,
    0
  );
  const type =
    totalStrength > 0
      ? 'ATTRACTION'
      : totalStrength < 0
      ? 'REPULSION'
      : 'RESONANCE';
  const strength = Math.min(1.0, Math.abs(totalStrength) / Math.max(1, nearbyEntities.length));
  return {
    strength,
    type,
    innerRadius: Math.max(0.2, sourceEntity.interactionPotential * 0.45),
    outerRadius: Math.max(0.5, sourceEntity.interactionPotential * 0.95),
    narrativeInfluence: sourceEntity.qualia_state.narrative_importance ?? 0,
  };
};

/**
 * Renderiza el campo de interacción visual entre entidades.
 */
const InteractionFieldRenderer: React.FC<{
  field: InteractionField;
  sourceEntity: PredictiveEntityState;
}> = ({ field, sourceEntity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const fieldMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          fieldStrength: { value: field.strength },
          interactionType: { value: field.type === 'ATTRACTION' ? 1.0 : field.type === 'REPULSION' ? -1.0 : 0.0 },
          narrativeInfluence: { value: field.narrativeInfluence ?? 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float fieldStrength;
          uniform float interactionType;
          uniform float narrativeInfluence;
          varying vec2 vUv;
          void main() {
            float distance = length(vUv - 0.5);
            float wave = sin(distance * 20.0 - time * 3.0 + narrativeInfluence * 5.0) * 0.5 + 0.5;
            vec3 color =
              interactionType > 0.5
                ? vec3(0.2, 0.8, 1.0)
                : interactionType < -0.5
                ? vec3(1.0, 0.3, 0.2)
                : vec3(0.7, 0.7, 0.2);
            float alpha = (1.0 - distance * 2.0) * wave * fieldStrength * (0.12 + narrativeInfluence * 0.2);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [field]
  );

  useFrame((state) => {
    if (meshRef.current) {
      fieldMaterial.uniforms.time.value = state.clock.elapsedTime;
      fieldMaterial.uniforms.narrativeInfluence.value = field.narrativeInfluence ?? 0;
      const scale = 1 + field.strength * 0.5 + (field.narrativeInfluence ?? 0) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} position={sourceEntity.center_of_mass.toArray()} material={fieldMaterial}>
      <ringGeometry args={[field.innerRadius, field.outerRadius, 48]} />
    </mesh>
  );
};

/**
 * Etiqueta avanzada para entidades, con diagnóstico de estado y detalles.
 */
const EntityLabel: React.FC<{
  entity: PredictiveEntityState;
  interpretedReality: InterpretedVisualReality;
}> = ({ entity, interpretedReality }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getEntityStatus = () => {
    const coherence = entity.qualia_state.temporal_coherence;
    const consciousness = entity.qualia_state.consciousness_density;
    if (coherence > 0.8 && consciousness > 0.7) return 'TRANSCENDENT';
    if (coherence < 0.3) return 'FRAGMENTING';
    if (consciousness > 0.8) return 'AWAKENING';
    if (interpretedReality.evolutionTendency === 'FRAGMENTATION') return 'CHAOTIC';
    return 'STABLE';
  };

  const statusColor = {
    TRANSCENDENT: '#FFD700',
    AWAKENING: '#00FF7F',
    STABLE: '#87CEEB',
    CHAOTIC: '#FF6347',
    FRAGMENTING: '#DC143C',
  }[getEntityStatus()];

  return (
    <div
      style={{
        color: 'white',
        background: 'rgba(0,0,0,0.85)',
        padding: '5px 10px',
        borderRadius: '7px',
        fontSize: '11px',
        fontFamily: 'monospace',
        border: `1.5px solid ${statusColor}`,
        boxShadow: `0 0 12px ${statusColor}40`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minWidth: '110px',
      }}
      onClick={() => setShowDetails(!showDetails)}
      data-testid="entity-label"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            animation: entity.qualia_state.arousal > 0.5 ? 'pulse 1s infinite' : 'none',
          }}
        />
        <span>{entity.id}</span>
        <span style={{ color: statusColor, fontSize: '9px' }}>
          [{getEntityStatus()}]
        </span>
      </div>
      {showDetails && <EntityInfoCard entity={entity} />}
    </div>
  );
};

/**
 * Aura visual avanzada para entidades con alta densidad de conciencia.
 */
const ConsciousnessAura: React.FC<{
  density: number;
  coherence: number;
  color: [number, number, number];
}> = ({ density, coherence, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const auraMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          density: { value: density },
          coherence: { value: coherence },
          baseColor: { value: new THREE.Color(...color) },
        },
        vertexShader: `
          varying vec3 vPosition;
          varying vec3 vNormal;
          void main() {
            vPosition = position;
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float density;
          uniform float coherence;
          uniform vec3 baseColor;
          varying vec3 vPosition;
          varying vec3 vNormal;
          void main() {
            float fresnel = pow(1.0 - dot(vNormal, vec3(0, 0, 1)), 2.0);
            float wave1 = sin(length(vPosition) * 10.0 - time * 2.0) * 0.5 + 0.5;
            float wave2 = sin(length(vPosition) * 7.0 - time * 1.5) * 0.5 + 0.5;
            float consciousness = (wave1 + wave2) * 0.5 * density;
            vec3 finalColor = baseColor + vec3(0.2, 0.2, 0.2) * coherence;
            float alpha = fresnel * consciousness * 0.32;
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
      }),
    [density, coherence, color]
  );

  useFrame((state) => {
    if (meshRef.current) {
      auraMaterial.uniforms.time.value = state.clock.elapsedTime;
      const breathingScale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.11 * coherence;
      meshRef.current.scale.setScalar(breathingScale);
    }
  });

  return (
    <mesh ref={meshRef} material={auraMaterial}>
      <sphereGeometry args={[2, 32, 32]} />
    </mesh>
  );
};

/**
 * OntologicalParticleSystem - Sistema avanzado de partículas para entidades ontológicas.
 * Integra interpretación visual, campos de interacción, etiquetas ricas y aura de conciencia.
 */
const OntologicalParticleSystem: React.FC<{
  entityState: PredictiveEntityState;
  globalState: WebSocketState;
}> = ({ entityState, globalState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Intérprete ontológico
  const interpreter = useMemo(() => new OntologicalInterpreter(), []);

  const [interactionField, setInteractionField] = useState<InteractionField | null>(null);

  // Interpretar la realidad de la entidad
  const interpretedReality = useMemo(
    () => interpreter.interpretEntity(entityState),
    [entityState, interpreter]
  );

  // Detectar interacciones con otras entidades
  useEffect(() => {
    const nearbyEntities = Array.from(globalState.entities.values())
      .filter((e) => e.id !== entityState.id)
      .filter(
        (e) =>
          entityState.center_of_mass.distanceTo(e.center_of_mass) <
          entityState.interactionPotential
      );
    if (nearbyEntities.length > 0) {
      setInteractionField(calculateInteractionField(entityState, nearbyEntities));
    } else {
      setInteractionField(null);
    }
  }, [entityState, globalState.entities]);

  // Sistema de partículas dinámico
  useEffect(() => {
    if (!pointsRef.current || !interpretedReality.pattern) return;
    const pattern = interpretedReality.pattern;
    const particleCount = pattern.length;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const coherenceLevels = new Float32Array(particleCount);
    const resonanceFreqs = new Float32Array(particleCount);
    const evolutionVectors = new Float32Array(particleCount * 3);

    pattern.forEach((particle: CollapsePatternParticle, i) => {
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;
      colors.set(particle.color, i * 3);
      sizes[i] = typeof particle.size === 'number' ? particle.size : 1.0;
      coherenceLevels[i] = particle.coherenceField ?? entityState.qualia_state.temporal_coherence;
      resonanceFreqs[i] = particle.resonanceFrequency ?? (i * 0.1);
      const evolutionVector = entityState.evolutionVector;
      evolutionVectors[i * 3] = evolutionVector.x;
      evolutionVectors[i * 3 + 1] = evolutionVector.y;
      evolutionVectors[i * 3 + 2] = evolutionVector.z;
    });

    if (!pointsRef.current.geometry) return;
    const geometry = pointsRef.current.geometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('customSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('coherenceLevel', new THREE.BufferAttribute(coherenceLevels, 1));
    geometry.setAttribute('resonanceFreq', new THREE.BufferAttribute(resonanceFreqs, 1));
    geometry.setAttribute('evolutionVector', new THREE.BufferAttribute(evolutionVectors, 3));
    Object.values(geometry.attributes).forEach((attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
      attr.needsUpdate = true;
    });
  }, [interpretedReality.pattern, entityState.evolutionVector, entityState.qualia_state.temporal_coherence]);

  // Crear material basado en el modo de renderizado
  const particleMaterial = useMemo(
    () => createOntologicalShader(interpretedReality.renderMode),
    [interpretedReality.renderMode]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.globalCoherence.value = globalState.realityCoherence;
      materialRef.current.uniforms.noosphereActivity.value = globalState.noosphereActivity;
    }
    if (groupRef.current) {
      groupRef.current.position.lerp(entityState.center_of_mass.clone(), 0.05);
      const rotationSpeed = (1 - entityState.qualia_state.temporal_coherence) * 0.02;
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} material={particleMaterial}>
        <bufferGeometry />
      </points>
      {interactionField && (
        <InteractionFieldRenderer field={interactionField} sourceEntity={entityState} />
      )}
      <Html position={[0, 2, 0]} center>
        <EntityLabel entity={entityState} interpretedReality={interpretedReality} />
      </Html>
      {entityState.qualia_state.consciousness_density > 0.7 && (
        <ConsciousnessAura
          density={entityState.qualia_state.consciousness_density}
          coherence={entityState.qualia_state.temporal_coherence}
          color={entityState.qualia_state.color}
        />
      )}
    </group>
  );
};

export default OntologicalParticleSystem;