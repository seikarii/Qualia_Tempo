import React from "react";
import type { QualiaState } from "../../types/contracts";
import type { MusicData } from "../../services/interfaces/IViewLogicService";
import FieldParticlesLayer from "./field-layers/FieldParticlesLayer";
import WavePlaneLayer from "./field-layers/WavePlaneLayer";
import AmbientSpheresLayer from "./field-layers/AmbientSpheresLayer";

interface QualiaFieldRendererProps {
  qualiaState: QualiaState;
  musicData: MusicData;
}

/**
 * QualiaFieldRenderer - Orchestrates visualization of the pervasive qualia field
 * QUALIA.CODE v1.2: Refactored via Composition Pattern (168→35 lines, 79% reduction)
 * Session 4 Achievement: Decomposed into 3 focused sub-components
 * 
 * ARCHITECTURAL FIX: Single Source of Truth Pattern
 * - Now receives complete QualiaState object instead of reconstructing it
 * - Eliminates hardcoded values (intensity: 0.5, chaos: 0.5, etc.)
 * - Maintains unidirectional data flow from GameStateStore
 *
 * This is NOT a map - it's a manifestation of subjective reality influenced by:
 * - Music intensity and harmony
 * - Player performance
 * - Order vs Chaos balance
 */
const QualiaFieldRenderer: React.FC<QualiaFieldRendererProps> = ({
  qualiaState,
  musicData,
}) => {
  return (
    <group>
      <FieldParticlesLayer qualiaState={qualiaState} musicData={musicData} />
      <WavePlaneLayer qualiaState={qualiaState} musicData={musicData} />
      <AmbientSpheresLayer qualiaState={qualiaState} musicData={musicData} />
    </group>
  );
};

export default QualiaFieldRenderer;
