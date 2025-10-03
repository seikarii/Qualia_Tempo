import React from "react";
import * as THREE from "three";
import { useViewLogicService } from "../../../services/hooks";
import type { QualiaState } from "../../../types/contracts";
import type { MusicData } from "../../../services/interfaces/IViewLogicService";

interface AmbientSpheresLayerProps {
  qualiaState: QualiaState;
  musicData: MusicData;
}

/**
 * AmbientSpheresLayer - Renders ambient light spheres
 * QUALIA.CODE v1.1: Extracted from QualiaFieldRenderer via Composition Pattern
 */
const AmbientSpheresLayer: React.FC<AmbientSpheresLayerProps> = ({
  qualiaState,
  musicData,
}) => {
  const viewLogicService = useViewLogicService();
  const visuals = viewLogicService.getQualiaFieldVisuals(qualiaState, musicData, 0);

  return (
    <>
      {visuals.ambientSpheres.map((sphere, i) => (
        <mesh
          key={i}
          position={sphere.position}
          scale={[sphere.scale, sphere.scale, sphere.scale]}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={new THREE.Color(...sphere.color)}
            transparent={true}
            opacity={sphere.opacity}
          />
        </mesh>
      ))}
    </>
  );
};

export default AmbientSpheresLayer;
