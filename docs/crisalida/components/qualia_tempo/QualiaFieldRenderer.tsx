import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface QualiaFieldRendererProps {
  qualiaField: {
    alpha: number;
    beta: number;
    coherence: number;
  };
  musicData: {
    intensity: number;
    harmony: number;
    emotional_valence: number;
    order_influence: number;
    chaos_influence: number;
  };
}

/**
 * QualiaFieldRenderer - Visualizes the pervasive qualia field as dynamic particles
 * and energy waves that respond to music and player performance.
 * 
 * This is NOT a map - it's a manifestation of subjective reality influenced by:
 * - Music intensity and harmony
 * - Player performance
 * - Order vs Chaos balance
 */
const QualiaFieldRenderer: React.FC<QualiaFieldRendererProps> = ({ 
  qualiaField, 
  musicData 
}) => {
  const fieldMeshRef = useRef<THREE.Points>(null);
  const fieldMaterialRef = useRef<THREE.PointsMaterial>(null);
  const waveRef = useRef<THREE.Mesh>(null);
  
  // Create field particles based on qualia parameters
  const { positions, colors, sizes } = useMemo(() => {
    const particleCount = Math.floor(1000 * qualiaField.coherence + 500);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles in 3D space with some structure based on order_influence
      const orderFactor = musicData.order_influence;
      const chaosFactor = musicData.chaos_influence;
      
      if (orderFactor > chaosFactor) {
        // More structured, grid-like distribution
        const gridSize = Math.ceil(Math.pow(particleCount, 1/3));
        const x = (i % gridSize) - gridSize/2;
        const y = (Math.floor(i / gridSize) % gridSize) - gridSize/2;
        const z = Math.floor(i / (gridSize * gridSize)) - gridSize/2;
        
        positions[i3] = x * 2 + (Math.random() - 0.5) * (1 - orderFactor);
        positions[i3 + 1] = y * 2 + (Math.random() - 0.5) * (1 - orderFactor);
        positions[i3 + 2] = z * 2 + (Math.random() - 0.5) * (1 - orderFactor);
      } else {
        // More chaotic distribution
        positions[i3] = (Math.random() - 0.5) * 40 * chaosFactor;
        positions[i3 + 1] = (Math.random() - 0.5) * 40 * chaosFactor;
        positions[i3 + 2] = (Math.random() - 0.5) * 40 * chaosFactor;
      }
      
      // Color based on emotional valence and field parameters
      const hue = (musicData.emotional_valence * 360 + i * 10) % 360;
      const saturation = 0.7 + qualiaField.alpha * 0.3;
      const lightness = 0.4 + qualiaField.beta * 0.4;
      
      const color = new THREE.Color().setHSL(hue / 360, saturation, lightness);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Size based on intensity and distance from center
      const distance = Math.sqrt(
        positions[i3] * positions[i3] + 
        positions[i3 + 1] * positions[i3 + 1] + 
        positions[i3 + 2] * positions[i3 + 2]
      );
      sizes[i] = (0.1 + musicData.intensity * 0.5) * (1 + Math.sin(distance * 0.1) * 0.3);
    }
    
    return { positions, colors, sizes };
  }, [qualiaField, musicData]);

  // Create wave geometry for field undulation
  const waveGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 20, 32, 32);
    return geometry;
  }, []);

  // Animate the field
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Animate field particles
    if (fieldMeshRef.current) {
      const positions = fieldMeshRef.current.geometry.attributes.position.array as Float32Array;
      const colors = fieldMeshRef.current.geometry.attributes.color.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Add wave motion based on music
        const waveAmplitude = musicData.intensity * 0.5;
        const waveFrequency = musicData.harmony * 2 + 1;
        
        positions[i + 1] += Math.sin(time * waveFrequency + positions[i] * 0.1) * waveAmplitude * 0.01;
        
        // Color shifting based on field dynamics
        const colorIndex = i;
        const hueShift = (time * 0.1 + i * 0.01) % 1;
        const baseHue = (musicData.emotional_valence + hueShift) % 1;
        const color = new THREE.Color().setHSL(baseHue, 0.7, 0.5 + qualiaField.alpha * 0.3);
        
        colors[colorIndex] = color.r;
        colors[colorIndex + 1] = color.g;
        colors[colorIndex + 2] = color.b;
      }
      
      fieldMeshRef.current.geometry.attributes.position.needsUpdate = true;
      fieldMeshRef.current.geometry.attributes.color.needsUpdate = true;
      
      // Rotate based on order/chaos balance
      fieldMeshRef.current.rotation.y += (musicData.order_influence - 0.5) * 0.005;
      fieldMeshRef.current.rotation.x += Math.sin(time * 0.5) * 0.002;
    }

    // Animate the wave plane
    if (waveRef.current) {
      const positions = waveRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const distance = Math.sqrt(x * x + z * z);
        
        positions[i + 1] = Math.sin(distance * 0.3 - time * 2) * qualiaField.alpha * 2 +
                          Math.cos(x * 0.2 + time) * qualiaField.beta * 1;
      }
      
      waveRef.current.geometry.attributes.position.needsUpdate = true;
      waveRef.current.material.opacity = 0.3 + musicData.intensity * 0.4;
    }

    // Update material properties
    if (fieldMaterialRef.current) {
      fieldMaterialRef.current.size = 0.1 + musicData.intensity * 0.3;
      fieldMaterialRef.current.opacity = 0.6 + qualiaField.coherence * 0.4;
    }
  });

  return (
    <group>
      {/* Field Particles */}
      <points ref={fieldMeshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sizes.length}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={fieldMaterialRef}
          size={0.2}
          sizeAttenuation={true}
          vertexColors={true}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Undulating Wave Plane */}
      <mesh ref={waveRef} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={waveGeometry} />
        <meshBasicMaterial
          color={new THREE.Color().setHSL(musicData.emotional_valence, 0.6, 0.4)}
          transparent={true}
          opacity={0.3}
          wireframe={true}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ambient Light Spheres */}
      {[...Array(5)].map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const radius = 8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(Date.now() * 0.001 + i) * 2;
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial
              color={new THREE.Color().setHSL((musicData.emotional_valence + i * 0.2) % 1, 0.8, 0.6)}
              transparent={true}
              opacity={0.4 + qualiaField.alpha * 0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default QualiaFieldRenderer;