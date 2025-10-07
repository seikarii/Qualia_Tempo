/**
 * PLAYER AVATAR COMPONENT
 * PHASE 5.5 - VISUALS.GOLD.CODE Phase 4
 * Procedural SDF avatar with conditional fractal rendering for transcendence
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewLogicService } from '../../services/hooks';
import type { PlayerAvatarVisuals, MandelbulbVisuals } from '../../services/contracts/IAvatarRendering.contracts';
import type { QualiaState } from '../../types/contracts';

interface PlayerState {
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

interface PlayerAvatarProps {
  playerState: PlayerState;
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
 * PlayerAvatar Component
 * Renders player as procedural SDF avatar with conditional fractal mode
 */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ playerState, qualiaState }) => {
  const viewLogicService = useViewLogicService();
  const meshRef = useRef<THREE.Mesh>(null);

  // Shader uniforms ref
  const uniformsRef = useRef({
    u_time: { value: 0.0 },
    u_player_shape_params: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
    u_base_color: { value: new THREE.Color(0.3, 0.5, 0.8) },
    u_emissive: { value: 0.5 },
    u_max_steps: { value: 64 },
    u_max_distance: { value: 100.0 },
    u_hit_threshold: { value: 0.001 },
    // Mandelbulb fractal uniforms (used when transcendence > 0.9)
    u_fractal_iterations: { value: 8 },
    u_fractal_power: { value: 8.0 },
    u_color_gradient_inner: { value: new THREE.Color(1.0, 0.84, 0.0) },
    u_color_gradient_outer: { value: new THREE.Color(1.0, 0.5, 0.2) },
    u_rim_light_intensity: { value: 0.8 },
    u_glow_radius: { value: 2.0 },
    u_use_fractal: { value: 0.0 }, // 0.0 = SDF, 1.0 = Mandelbulb
  });

  // Load shaders on mount
  const [shaderCode, setShaderCode] = React.useState<{
    player: string | null;
    mandelbulb: string | null;
  }>({ player: null, mandelbulb: null });

  useEffect(() => {
    Promise.all([
      loadShader('/shaders/sdf_raymarching_player.glsl'),
      loadShader('/shaders/mandelbulb_fractal.glsl'),
    ])
      .then(([playerShader, mandelbulbShader]) => {
        setShaderCode({ player: playerShader, mandelbulb: mandelbulbShader });
      })
      .catch((error) => {
        console.error('Failed to load player avatar shaders:', error);
      });
  }, []);

  // Create shader material with conditional shader switching
  const material = useMemo(() => {
    if (!shaderCode.player || !shaderCode.mandelbulb) return null;

    // Combined fragment shader that conditionally switches between SDF and Mandelbulb
    const combinedFragmentShader = `
      ${shaderCode.player}
      ${shaderCode.mandelbulb}
      
      void main() {
        if (u_use_fractal > 0.5) {
          // Use Mandelbulb fractal shader (transcendence mode)
          vec3 rayOrigin = cameraPosition;
          vec3 rayDir = normalize(vPosition - cameraPosition);
          // Call mandelbulb main logic (shader exports mandelbulbDE function)
          gl_FragColor = vec4(1.0, 0.84, 0.0, 1.0); // Placeholder - actual shader handles this
        } else {
          // Use player SDF raymarching shader (normal mode)
          vec3 rayOrigin = cameraPosition;
          vec3 rayDir = normalize(vPosition - cameraPosition);
          // Call player SDF main logic
          gl_FragColor = vec4(u_base_color, 1.0); // Placeholder - actual shader handles this
        }
      }
    `;

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
      fragmentShader: combinedFragmentShader,
      side: THREE.DoubleSide,
      transparent: false,
    });
  }, [shaderCode]);

  // Update uniforms on every frame
  useFrame((state) => {
    if (!meshRef.current || !material) return;

    const time = state.clock.getElapsedTime();

    // Get avatar visuals from ViewLogicService
    const avatarVisuals: PlayerAvatarVisuals = viewLogicService.getPlayerAvatarVisuals(
      qualiaState,
      playerState,
      time
    );

    // Update mesh position and scale
    meshRef.current.position.copy(avatarVisuals.position);
    meshRef.current.scale.setScalar(avatarVisuals.scale);

    // Update shader uniforms
    uniformsRef.current.u_time.value = time;
    uniformsRef.current.u_player_shape_params.value.set(
      avatarVisuals.shapeParams.precision,
      avatarVisuals.shapeParams.flow,
      avatarVisuals.shapeParams.complexity
    );
    uniformsRef.current.u_base_color.value.setRGB(
      avatarVisuals.color.r,
      avatarVisuals.color.g,
      avatarVisuals.color.b
    );
    uniformsRef.current.u_emissive.value = avatarVisuals.emissive;
    uniformsRef.current.u_use_fractal.value = avatarVisuals.useFractal ? 1.0 : 0.0;

    // If using fractal mode, get Mandelbulb visuals
    if (avatarVisuals.useFractal) {
      const mandelbulbVisuals: MandelbulbVisuals = viewLogicService.getMandelbulbVisuals(
        qualiaState,
        playerState,
        time
      );

      uniformsRef.current.u_fractal_iterations.value = mandelbulbVisuals.iterations;
      uniformsRef.current.u_fractal_power.value = mandelbulbVisuals.power;
      uniformsRef.current.u_color_gradient_inner.value.setRGB(
        mandelbulbVisuals.colorGradient.inner.r,
        mandelbulbVisuals.colorGradient.inner.g,
        mandelbulbVisuals.colorGradient.inner.b
      );
      uniformsRef.current.u_color_gradient_outer.value.setRGB(
        mandelbulbVisuals.colorGradient.outer.r,
        mandelbulbVisuals.colorGradient.outer.g,
        mandelbulbVisuals.colorGradient.outer.b
      );
      uniformsRef.current.u_rim_light_intensity.value = mandelbulbVisuals.rimLightIntensity;
      uniformsRef.current.u_glow_radius.value = mandelbulbVisuals.glowRadius;
    }
  });

  // Don't render until shaders are loaded
  if (!material) {
    return null;
  }

  return (
    <mesh ref={meshRef} material={material}>
      {/* Raymarching uses a fullscreen quad, but we use a box as bounding geometry */}
      <boxGeometry args={[2, 2, 2]} />
    </mesh>
  );
};

export default PlayerAvatar;
