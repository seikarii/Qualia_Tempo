import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from "../../services/hooks";
import { QualiaFieldVisualData } from "../../services/contracts/IViewLogicService.contracts";

interface QualiaFieldRendererProps {
  qualiaField: {
    alpha: number;
    beta: number;
    coherence: number;
  };
  musicData: {
    tempo: number;
    beat_position: number;
    intensity: number;
    frequency_bands: number[];
    order_influence: number;
    chaos_influence: number;
    emotional_valence: number;
    harmony: number;
  };
}

/**
 * QualiaFieldRenderer - Visualizes the pervasive qualia field as dynamic particles
 * and energy waves that respond to music and player performance.
 * QUALIA.CODE v1.1: Refactored to follow Stateless View-Logic Pattern
 *
 * This is NOT a map - it's a manifestation of subjective reality influenced by:
 * - Music intensity and harmony
 * - Player performance
 * - Order vs Chaos balance
 */
const QualiaFieldRenderer: React.FC<QualiaFieldRendererProps> = ({
  qualiaField,
  musicData,
}) => {
  // QUALIA.CODE v1.1: Service injection for business logic separation
  const viewLogicService = useViewLogicService();
  
  const fieldMeshRef = useRef<THREE.Points>(null);
  const fieldMaterialRef = useRef<THREE.PointsMaterial>(null);
  const waveRef = useRef<THREE.Mesh>(null);

  // Store current visual state for JSX rendering
  const [currentVisuals, setCurrentVisuals] = useState<QualiaFieldVisualData | null>(null);
  
  // Get default visuals if no current state available
  const visuals = currentVisuals ?? viewLogicService.getQualiaFieldVisuals(qualiaField, musicData, 0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // QUALIA.CODE v1.1: Business logic extracted to ViewLogicService
    const fieldVisuals = viewLogicService.getQualiaFieldVisuals(qualiaField, musicData, time);
    
    // Store visual data for JSX rendering
    setCurrentVisuals(fieldVisuals);

    // Apply calculated visual properties to Three.js objects
    if (fieldMeshRef.current) {
      // Update geometry attributes by copying data
      const positionAttribute = fieldMeshRef.current.geometry.attributes.position;
      const colorAttribute = fieldMeshRef.current.geometry.attributes.color;
      
      if (positionAttribute && colorAttribute) {
        (positionAttribute.array as Float32Array).set(fieldVisuals.fieldParticles.positions);
        (colorAttribute.array as Float32Array).set(fieldVisuals.fieldParticles.colors);
        positionAttribute.needsUpdate = true;
        colorAttribute.needsUpdate = true;
      }

      // Apply rotation
      fieldMeshRef.current.rotation.set(...fieldVisuals.fieldParticles.rotation);
    }

    // Apply wave plane properties
    if (waveRef.current) {
      const positionAttribute = waveRef.current.geometry.attributes.position;
      if (positionAttribute) {
        (positionAttribute.array as Float32Array).set(fieldVisuals.wavePlane.positions);
        positionAttribute.needsUpdate = true;
      }
      
      waveRef.current.position.set(...fieldVisuals.wavePlane.position);
      waveRef.current.rotation.set(...fieldVisuals.wavePlane.rotation);

      if (waveRef.current.material instanceof THREE.Material) {
        waveRef.current.material.opacity = fieldVisuals.wavePlane.opacity;
      }
    }

    // Update material properties
    if (fieldMaterialRef.current) {
      fieldMaterialRef.current.size = fieldVisuals.fieldParticles.materialSize;
      fieldMaterialRef.current.opacity = fieldVisuals.fieldParticles.materialOpacity;
    }
  });

  return (
    <group>
      {/* Field Particles */}
      <points ref={fieldMeshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={visuals.fieldParticles.count}
            array={visuals.fieldParticles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={visuals.fieldParticles.count}
            array={visuals.fieldParticles.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={visuals.fieldParticles.count}
            array={visuals.fieldParticles.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={fieldMaterialRef}
          size={visuals.fieldParticles.materialSize}
          sizeAttenuation={true}
          vertexColors={true}
          transparent={true}
          opacity={visuals.fieldParticles.materialOpacity}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Undulating Wave Plane */}
      <mesh ref={waveRef} position={visuals.wavePlane.position} rotation={visuals.wavePlane.rotation}>
        <planeGeometry args={[20, 20, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(...visuals.wavePlane.color)}
          transparent={true}
          opacity={visuals.wavePlane.opacity}
          wireframe={true}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ambient Light Spheres */}
      {visuals.ambientSpheres.map((sphere, i) => (
        <mesh key={i} position={sphere.position} scale={[sphere.scale, sphere.scale, sphere.scale]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={new THREE.Color(...sphere.color)}
            transparent={true}
            opacity={sphere.opacity}
          />
        </mesh>
      ))}
    </group>
  );
};

export default QualiaFieldRenderer;
