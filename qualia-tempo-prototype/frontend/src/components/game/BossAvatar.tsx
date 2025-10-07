/**
 * BOSS AVATAR COMPONENT
 * PHASE 5.5 - VISUALS.GOLD.CODE Phase 4
 * Procedural SDF avatar with organic distorted forms
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewLogicService } from '../../services/hooks';
import type { BossAvatarVisuals } from '../../services/contracts/IAvatarRendering.contracts';
import type { QualiaState } from '../../types/contracts';

interface BossState {
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

interface BossAvatarProps {
  bossState: BossState;
  qualiaState: QualiaState;
}

/**
 * Load SDF raymarching shader from file
 * @param shaderPath - Path to GLSL shader file
 * @returns Shader code as string
 */
async function loadShader(shaderPath: string): Promise<string> {
  const response = await fetch(shaderPath);
  if (!response.ok) {
    throw new Error(`Failed to load shader: ${shaderPath}`);
  }
  return await response.text();
}

/**
 * BossAvatar Component
 * Renders boss as procedural SDF avatar with organic distortion
 */
export const BossAvatar: React.FC<BossAvatarProps> = ({ bossState, qualiaState }) => {
  const viewLogicService = useViewLogicService();
  const meshRef = useRef<THREE.Mesh>(null);

  // Shader uniforms ref
  const uniformsRef = useRef({
    u_time: { value: 0.0 },
    u_boss_shape_params: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
    u_base_color: { value: new THREE.Color(0.8, 0.2, 0.1) },
    u_emissive: { value: 0.5 },
    u_time_offset: { value: 0.0 },
    u_max_steps: { value: 128 },
    u_max_distance: { value: 100.0 },
    u_hit_threshold: { value: 0.001 },
  });

  // Load shader on mount
  const [shaderCode, setShaderCode] = React.useState<string | null>(null);

  useEffect(() => {
    loadShader('/shaders/sdf_raymarching_boss.glsl')
      .then((shader) => {
        setShaderCode(shader);
      })
      .catch((error) => {
        console.error('Failed to load boss avatar shader:', error);
      });
  }, []);

  // Create shader material
  const material = useMemo(() => {
    if (!shaderCode) return null;

    return new THREE.ShaderMaterial({
      uniforms: uniformsRef.current,
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: shaderCode,
      side: THREE.DoubleSide,
      transparent: false,
    });
  }, [shaderCode]);

  // Update uniforms on every frame
  useFrame((state) => {
    if (!meshRef.current || !material) return;

    const time = state.clock.getElapsedTime();

    // Get avatar visuals from ViewLogicService
    const avatarVisuals: BossAvatarVisuals = viewLogicService.getBossAvatarVisuals(
      qualiaState,
      bossState,
      time
    );

    // Update mesh position and scale
    meshRef.current.position.copy(avatarVisuals.position);
    meshRef.current.scale.setScalar(avatarVisuals.scale);

    // Update shader uniforms
    uniformsRef.current.u_time.value = time;
    uniformsRef.current.u_boss_shape_params.value.set(
      avatarVisuals.shapeParams.chaos,
      avatarVisuals.shapeParams.aggression,
      avatarVisuals.shapeParams.distortion
    );
    uniformsRef.current.u_base_color.value.setRGB(
      avatarVisuals.color.r,
      avatarVisuals.color.g,
      avatarVisuals.color.b
    );
    uniformsRef.current.u_emissive.value = avatarVisuals.emissive;
    uniformsRef.current.u_time_offset.value = avatarVisuals.timeOffset;
  });

  // Don't render until shader is loaded
  if (!material) {
    return null;
  }

  return (
    <mesh ref={meshRef} material={material}>
      {/* Raymarching uses a fullscreen quad, but we use a larger box for boss */}
      <boxGeometry args={[4, 4, 4]} />
    </mesh>
  );
};

export default BossAvatar;
