import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PredictiveEntityState, InteractionField } from '../core/types';

/**
 * InteractionFieldRenderer - Renderiza campos de interacción avanzados entre entidades.
 * Incluye soporte para resonancia, influencia narrativa y visualización dinámica.
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
          interactionType: {
            value:
              field.type === 'ATTRACTION'
                ? 1.0
                : field.type === 'REPULSION'
                ? -1.0
                : field.type === 'RESONANCE'
                ? 0.5
                : 0.0,
          },
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
      const scale =
        1 + field.strength * 0.5 + (field.narrativeInfluence ?? 0) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={sourceEntity.center_of_mass.toArray()}
      material={fieldMaterial}
    >
      <ringGeometry args={[field.innerRadius, field.outerRadius, 48]} />
    </mesh>
  );
};

export default InteractionFieldRenderer;