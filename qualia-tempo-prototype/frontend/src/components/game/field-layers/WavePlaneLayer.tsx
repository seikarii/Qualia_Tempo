import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewLogicService } from "../../../services/hooks";
import type { QualiaState } from "../../../types/contracts";
import type { MusicData } from "../../../services/interfaces/IViewLogicService";

interface WavePlaneLayerProps {
  qualiaState: QualiaState;
  musicData: MusicData;
}

/**
 * WavePlaneLayer - Renders undulating wave plane that responds to music
 * QUALIA.CODE v1.1: Extracted from QualiaFieldRenderer via Composition Pattern
 */
const WavePlaneLayer: React.FC<WavePlaneLayerProps> = ({
  qualiaState,
  musicData,
}) => {
  const viewLogicService = useViewLogicService();
  const waveRef = useRef<THREE.Mesh>(null);

  // Get initial visual data for JSX attributes
  const initialVisuals = viewLogicService.getQualiaFieldVisuals(qualiaState, musicData, 0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const fieldVisuals = viewLogicService.getQualiaFieldVisuals(qualiaState, musicData, time);

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
  });

  return (
    <mesh
      ref={waveRef}
      position={initialVisuals.wavePlane.position}
      rotation={initialVisuals.wavePlane.rotation}
    >
      <planeGeometry args={[20, 20, 32, 32]} />
      <meshBasicMaterial
        color={new THREE.Color(...initialVisuals.wavePlane.color)}
        transparent={true}
        opacity={initialVisuals.wavePlane.opacity}
        wireframe={true}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default WavePlaneLayer;
