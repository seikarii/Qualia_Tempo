import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ConsciousnessAura - Aura visual avanzada para entidades con alta densidad de conciencia.
 * Integra pulsos de coherencia, respiración evolutiva y color adaptativo.
 * Optimizado para renderizado místico y diagnóstico ontológico.
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
            // Ondas de conciencia y pulsos evolutivos
            float wave1 = sin(length(vPosition) * 10.0 - time * 2.0 + coherence * 2.5) * 0.5 + 0.5;
            float wave2 = sin(length(vPosition) * 7.0 - time * 1.5 + density * 3.0) * 0.5 + 0.5;
            float breathing = sin(time * 1.2 + density * 2.0) * 0.5 + 0.5;
            float consciousness = (wave1 + wave2) * 0.5 * density * (0.8 + coherence * 0.4) * (0.9 + breathing * 0.2);
            // Color adaptativo con pulso de coherencia y densidad
            vec3 finalColor = baseColor + vec3(0.22, 0.18, 0.28) * coherence + vec3(0.08, 0.12, 0.09) * density;
            float alpha = fresnel * consciousness * (0.32 + coherence * 0.12);
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
      // Respiración evolutiva del aura
      const breathingScale =
        1 +
        Math.sin(state.clock.elapsedTime * 1.5 + density * 2.0) * 0.11 * coherence +
        Math.sin(state.clock.elapsedTime * 0.7 + coherence * 1.5) * 0.05 * density;
      meshRef.current.scale.setScalar(breathingScale);
    }
  });

  return (
    <mesh ref={meshRef} material={auraMaterial}>
      <sphereGeometry args={[2, 32, 32]} />
    </mesh>
  );
};

export default ConsciousnessAura;
