import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from "../../../services/hooks";
import type { QualiaState } from "../../../types/contracts";
import type { MusicData } from "../../../services/interfaces/IViewLogicService";
import type { QualiaFieldVisualData } from "../../../services/contracts/IViewLogicService.contracts";

interface FieldParticlesLayerProps {
  qualiaState: QualiaState;
  musicData: MusicData;
}

/**
 * updateParticleBuffers - Update particle geometry attributes
 * QUALIA.CODE COMPLIANT: Extract Method Pattern
 */
const updateParticleBuffers = (
  geometry: THREE.BufferGeometry,
  fieldVisuals: QualiaFieldVisualData
): void => {
  const positionAttribute = geometry.attributes.position;
  const colorAttribute = geometry.attributes.color;

  if (positionAttribute && colorAttribute) {
    (positionAttribute.array as Float32Array).set(fieldVisuals.fieldParticles.positions);
    (colorAttribute.array as Float32Array).set(fieldVisuals.fieldParticles.colors);
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }
};

/**
 * FieldParticlesLayer - Renders dynamic field particles that respond to qualia state
 * QUALIA.CODE v1.1: Extracted from QualiaFieldRenderer via Composition Pattern
 */
/**
 * ParticleGeometry - Buffer geometry with particle attributes
 * QUALIA.CODE COMPLIANT: Extract Component Pattern
 */
interface ParticleGeometryProps {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

const ParticleGeometry: React.FC<ParticleGeometryProps> = ({ count, positions, colors, sizes }) => (
  <bufferGeometry>
    <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
    <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
    <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
  </bufferGeometry>
);

const FieldParticlesLayer: React.FC<FieldParticlesLayerProps> = ({
  qualiaState,
  musicData,
}) => {
  const viewLogicService = useViewLogicService();
  const fieldMeshRef = useRef<THREE.Points>(null);
  const fieldMaterialRef = useRef<THREE.PointsMaterial>(null);

  // Get initial visual data for JSX attributes
  const initialVisuals = viewLogicService.getQualiaFieldVisuals(qualiaState, musicData, 0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const fieldVisuals = viewLogicService.getQualiaFieldVisuals(qualiaState, musicData, time);

    if (fieldMeshRef.current) {
      updateParticleBuffers(fieldMeshRef.current.geometry, fieldVisuals);
      fieldMeshRef.current.rotation.set(...fieldVisuals.fieldParticles.rotation);
    }

    if (fieldMaterialRef.current) {
      fieldMaterialRef.current.size = fieldVisuals.fieldParticles.materialSize;
      fieldMaterialRef.current.opacity = fieldVisuals.fieldParticles.materialOpacity;
    }
  });

  return (
    <points ref={fieldMeshRef}>
      <ParticleGeometry
        count={initialVisuals.fieldParticles.count}
        positions={initialVisuals.fieldParticles.positions}
        colors={initialVisuals.fieldParticles.colors}
        sizes={initialVisuals.fieldParticles.sizes}
      />
      <pointsMaterial
        ref={fieldMaterialRef}
        size={initialVisuals.fieldParticles.materialSize}
        sizeAttenuation={true}
        vertexColors={true}
        transparent={true}
        opacity={initialVisuals.fieldParticles.materialOpacity}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default FieldParticlesLayer;
